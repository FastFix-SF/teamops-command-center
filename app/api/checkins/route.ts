import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { transcribeAudio, analyzeImage, generateCheckinReport } from '@/lib/openai'
import { sendSMS } from '@/lib/sms'

// Get all check-ins
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const taskId = searchParams.get('taskId')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (memberId) where.memberId = memberId
    if (taskId) where.taskId = taskId

    const checkins = await prisma.aICheckin.findMany({
      where,
      include: {
        member: { select: { name: true, avatarUrl: true } },
        task: { select: { title: true } },
        attachments: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json(checkins)
  } catch (error) {
    console.error('Error fetching checkins:', error)
    return NextResponse.json({ error: 'Error obteniendo check-ins' }, { status: 500 })
  }
}

// Create a new check-in (with media processing)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const memberId = formData.get('memberId') as string
    const taskId = formData.get('taskId') as string | null
    const type = formData.get('type') as string || 'VOICE'
    const audio = formData.get('audio') as File | null
    const video = formData.get('video') as File | null
    const textContent = formData.get('text') as string | null
    const images = formData.getAll('images') as File[]

    // Get member info
    const member = memberId
      ? await prisma.member.findUnique({ where: { id: memberId } })
      : await prisma.member.findFirst({ where: { isActive: true } })

    if (!member) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 400 })
    }

    // Get task info
    const task = taskId
      ? await prisma.task.findUnique({ where: { id: taskId } })
      : null

    // Process media
    let transcription = textContent || ''
    let mediaUrl = null
    let thumbnailUrl = null
    let durationSeconds = null

    // Transcribe audio/video
    if (audio || video) {
      const mediaFile = audio || video
      const buffer = Buffer.from(await mediaFile!.arrayBuffer())

      // In production, you would upload the media file to storage (S3, Cloudinary, etc.)
      // For demo, we'll just process it
      mediaUrl = `data:${mediaFile!.type};base64,${buffer.toString('base64').slice(0, 100)}...`

      // Transcribe
      transcription = await transcribeAudio(buffer)

      // Estimate duration (very rough estimate based on file size)
      durationSeconds = Math.round(buffer.length / 16000) // Rough estimate
    }

    // Analyze images
    const imageAnalyses: string[] = []
    const attachmentData: Array<{ type: string; url: string; aiAnalysis: string }> = []

    for (const image of images) {
      const buffer = Buffer.from(await image.arrayBuffer())
      const base64 = buffer.toString('base64')

      // Analyze with GPT-4 Vision
      const analysis = await analyzeImage(base64, `Contexto: Check-in de ${member.name} para ${task?.title || 'actualización general'}`)
      imageAnalyses.push(analysis)

      attachmentData.push({
        type: 'IMAGE',
        url: `data:${image.type};base64,${base64.slice(0, 100)}...`, // In production: real URL
        aiAnalysis: analysis
      })
    }

    // Generate AI report
    const report = await generateCheckinReport(
      transcription,
      imageAnalyses,
      member.name,
      task?.title
    )

    // Save check-in
    const checkin = await prisma.aICheckin.create({
      data: {
        memberId: member.id,
        taskId: task?.id,
        type,
        mediaUrl,
        thumbnailUrl,
        durationSeconds,
        transcription,
        aiSummary: report.summary,
        aiReport: report.report,
        extractedProgress: report.extractedProgress,
        extractedBlockers: report.extractedBlockers,
        extractedNextSteps: report.extractedNextSteps,
        sentiment: report.sentiment,
        confidence: report.confidence,
        processedAt: new Date(),
        attachments: {
          create: attachmentData
        }
      },
      include: {
        attachments: true
      }
    })

    // Auto-update task if progress detected
    if (task) {
      const updates: Record<string, unknown> = {
        lastCheckinAt: new Date()
      }

      // Update progress if AI detected higher progress
      if (report.extractedProgress > task.progressPercent) {
        updates.progressPercent = report.extractedProgress
      }

      // Update blockers if detected
      if (report.extractedBlockers) {
        updates.blockerNotes = report.extractedBlockers
        if (task.status !== 'BLOCKED') {
          updates.status = 'BLOCKED'
        }
      } else if (task.status === 'BLOCKED' && !report.extractedBlockers) {
        // Clear blocked status if no blockers mentioned
        updates.status = 'IN_PROGRESS'
      }

      // Mark as done if 100%
      if (report.extractedProgress >= 100) {
        updates.status = 'DONE'
        updates.completedAt = new Date()
      }

      await prisma.task.update({
        where: { id: task.id },
        data: updates
      })

      // Notify owner of significant progress
      if (report.extractedProgress >= 100 || report.extractedProgress - task.progressPercent >= 30) {
        const owner = await prisma.member.findFirst({
          where: { role: { contains: 'Owner' } }
        })

        if (owner?.phone) {
          const progressEmoji = report.extractedProgress >= 100 ? '🎉' : '📈'
          await sendSMS(
            owner.phone,
            `${progressEmoji} ${member.name} actualizó "${task.title}": ${report.extractedProgress}%\n\n${report.summary}`
          )

          await prisma.notification.create({
            data: {
              memberId: owner.id,
              type: 'PROGRESS_UPDATE',
              channel: 'SMS',
              subject: `Progreso: ${task.title}`,
              message: `${member.name}: ${report.extractedProgress}% - ${report.summary}`,
              status: 'SENT',
              sentAt: new Date()
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkin: {
        id: checkin.id,
        type: checkin.type,
        transcription: checkin.transcription,
        summary: checkin.aiSummary,
        report: checkin.aiReport,
        progress: checkin.extractedProgress,
        blockers: checkin.extractedBlockers,
        nextSteps: checkin.extractedNextSteps,
        sentiment: checkin.sentiment,
        confidence: checkin.confidence,
        attachments: checkin.attachments.length
      },
      taskUpdated: !!task,
      taskProgress: task ? report.extractedProgress : null
    })
  } catch (error) {
    console.error('Check-in creation error:', error)
    return NextResponse.json(
      { error: 'Error procesando check-in' },
      { status: 500 }
    )
  }
}

// Delete a check-in
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await prisma.aICheckin.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Error eliminando check-in' }, { status: 500 })
  }
}
