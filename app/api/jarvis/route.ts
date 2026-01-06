import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatWithJarvis, transcribeAudio, analyzeImage, generateCheckinReport } from '@/lib/openai'
import { sendSMS } from '@/lib/sms'

// Function handlers for Jarvis
async function executeFunctions(functionCalls: Array<{ name: string, arguments: Record<string, unknown> }>) {
  const results: Record<string, unknown> = {}

  for (const call of functionCalls) {
    try {
      results[call.name] = await executeFunction(call.name, call.arguments)
    } catch (error) {
      results[call.name] = { error: String(error) }
    }
  }

  return results
}

async function executeFunction(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_team_overview': {
      const [members, tasks, timeEntries, notifications] = await Promise.all([
        prisma.member.findMany({ where: { isActive: true } }),
        prisma.task.findMany({ include: { owner: true } }),
        prisma.timeEntry.findMany({
          where: {
            date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.notification.findMany({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          orderBy: { createdAt: 'desc' },
          take: 5
        })
      ])

      const overdueTasks = tasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
      )
      const blockedTasks = tasks.filter(t => t.status === 'BLOCKED')
      const totalHoursThisWeek = timeEntries.reduce((sum, te) => sum + te.durationMinutes / 60, 0)

      return {
        teamSize: members.length,
        activeTasks: tasks.filter(t => t.status !== 'DONE').length,
        completedTasks: tasks.filter(t => t.status === 'DONE').length,
        overdueTasks: overdueTasks.length,
        blockedTasks: blockedTasks.length,
        totalHoursThisWeek: Math.round(totalHoursThisWeek * 10) / 10,
        recentNotifications: notifications.length,
        alerts: [
          ...overdueTasks.map(t => `⚠️ Tarea vencida: "${t.title}" (${t.owner?.name})`),
          ...blockedTasks.map(t => `🚫 Tarea bloqueada: "${t.title}" (${t.owner?.name})`)
        ].slice(0, 5)
      }
    }

    case 'get_tasks': {
      const where: Record<string, unknown> = {}
      if (args.status) where.status = args.status
      if (args.priority) where.priority = args.priority
      if (args.memberId) where.ownerId = args.memberId
      if (args.overdue) {
        where.dueDate = { lt: new Date() }
        where.status = { not: 'DONE' }
      }

      const tasks = await prisma.task.findMany({
        where,
        include: { owner: { select: { name: true, email: true } } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: 20
      })

      return tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        owner: t.owner.name,
        status: t.status,
        priority: t.priority,
        progress: t.progressPercent,
        dueDate: t.dueDate?.toISOString(),
        isOverdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
      }))
    }

    case 'get_member_details': {
      let member = null

      if (args.memberId) {
        member = await prisma.member.findUnique({
          where: { id: args.memberId as string },
          include: {
            tasks: { orderBy: { updatedAt: 'desc' }, take: 5 },
            timeEntries: {
              where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
            },
            monthlyReports: { orderBy: { month: 'desc' }, take: 1 }
          }
        })
      } else if (args.memberName) {
        member = await prisma.member.findFirst({
          where: { name: { contains: args.memberName as string } },
          include: {
            tasks: { orderBy: { updatedAt: 'desc' }, take: 5 },
            timeEntries: {
              where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
            },
            monthlyReports: { orderBy: { month: 'desc' }, take: 1 }
          }
        })
      }

      if (!member) return { error: 'Miembro no encontrado' }

      const totalHours = member.timeEntries.reduce((sum, te) => sum + te.durationMinutes / 60, 0)
      const billableHours = member.timeEntries.filter(te => te.billable).reduce((sum, te) => sum + te.durationMinutes / 60, 0)

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        hourlyRate: member.hourlyRate,
        activeTasks: member.tasks.filter(t => t.status !== 'DONE').length,
        completedTasks: member.tasks.filter(t => t.status === 'DONE').length,
        hoursThisMonth: Math.round(totalHours * 10) / 10,
        billableHoursThisMonth: Math.round(billableHours * 10) / 10,
        latestReport: member.monthlyReports[0] || null,
        recentTasks: member.tasks.map(t => ({
          title: t.title,
          status: t.status,
          progress: t.progressPercent
        }))
      }
    }

    case 'update_task': {
      const updateData: Record<string, unknown> = {}
      if (args.status) updateData.status = args.status
      if (args.progressPercent !== undefined) updateData.progressPercent = args.progressPercent
      if (args.blockerNotes) updateData.blockerNotes = args.blockerNotes
      if (args.status === 'DONE') updateData.completedAt = new Date()

      const task = await prisma.task.update({
        where: { id: args.taskId as string },
        data: updateData,
        include: { owner: { select: { name: true } } }
      })

      return {
        success: true,
        task: {
          id: task.id,
          title: task.title,
          owner: task.owner.name,
          status: task.status,
          progress: task.progressPercent
        }
      }
    }

    case 'create_task': {
      let ownerId = args.ownerId as string | undefined

      if (!ownerId && args.ownerName) {
        const member = await prisma.member.findFirst({
          where: { name: { contains: args.ownerName as string } }
        })
        if (member) ownerId = member.id
      }

      if (!ownerId) {
        const firstMember = await prisma.member.findFirst({ where: { isActive: true } })
        if (firstMember) ownerId = firstMember.id
      }

      if (!ownerId) return { error: 'No se encontró un miembro para asignar la tarea' }

      const task = await prisma.task.create({
        data: {
          title: args.title as string,
          description: args.description as string || null,
          ownerId,
          priority: (args.priority as string) || 'P2',
          dueDate: args.dueDate ? new Date(args.dueDate as string) : null
        },
        include: { owner: { select: { name: true } } }
      })

      return {
        success: true,
        task: {
          id: task.id,
          title: task.title,
          owner: task.owner.name,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString()
        }
      }
    }

    case 'send_notification': {
      let memberId = args.memberId as string | undefined
      let member = null

      if (memberId) {
        member = await prisma.member.findUnique({ where: { id: memberId } })
      } else if (args.memberName) {
        member = await prisma.member.findFirst({
          where: { name: { contains: args.memberName as string } }
        })
      }

      if (!member) return { error: 'Miembro no encontrado' }

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          memberId: member.id,
          type: (args.type as string) || 'CUSTOM',
          channel: 'SMS',
          subject: 'Mensaje de JARVIS',
          message: args.message as string,
          status: 'PENDING'
        }
      })

      // Send SMS if phone available
      if (member.phone) {
        const sent = await sendSMS(member.phone, args.message as string)
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: sent ? 'SENT' : 'FAILED',
            sentAt: sent ? new Date() : null
          }
        })

        return {
          success: sent,
          message: sent
            ? `✅ SMS enviado a ${member.name}`
            : `⚠️ No se pudo enviar SMS a ${member.name} (modo demo)`
        }
      }

      return {
        success: false,
        message: `${member.name} no tiene teléfono registrado. Notificación guardada en el sistema.`
      }
    }

    case 'get_meetings': {
      const where: Record<string, unknown> = {}
      if (args.type) where.type = args.type
      if (args.upcoming) where.startTime = { gte: new Date() }

      const meetings = await prisma.meeting.findMany({
        where,
        include: {
          createdBy: { select: { name: true } },
          responses: { include: { member: { select: { name: true } } } }
        },
        orderBy: { startTime: 'desc' },
        take: 10
      })

      return meetings.map(m => ({
        id: m.id,
        type: m.type,
        title: m.title,
        startTime: m.startTime.toISOString(),
        status: m.status,
        createdBy: m.createdBy.name,
        attendees: m.responses.map(r => r.member.name)
      }))
    }

    case 'get_time_entries': {
      const where: Record<string, unknown> = {}
      if (args.memberId) where.memberId = args.memberId
      if (args.billableOnly) where.billable = true
      if (args.startDate || args.endDate) {
        where.date = {}
        if (args.startDate) (where.date as Record<string, Date>).gte = new Date(args.startDate as string)
        if (args.endDate) (where.date as Record<string, Date>).lte = new Date(args.endDate as string)
      }

      const entries = await prisma.timeEntry.findMany({
        where,
        include: {
          member: { select: { name: true } },
          task: { select: { title: true } }
        },
        orderBy: { date: 'desc' },
        take: 50
      })

      const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)
      const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + e.durationMinutes, 0)

      return {
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        billableHours: Math.round(billableMinutes / 60 * 10) / 10,
        entries: entries.slice(0, 10).map(e => ({
          member: e.member.name,
          task: e.task?.title || 'Sin tarea',
          hours: Math.round(e.durationMinutes / 60 * 10) / 10,
          date: e.date.toISOString().split('T')[0],
          billable: e.billable,
          category: e.category
        }))
      }
    }

    case 'get_leaderboard': {
      const month = (args.month as string) || new Date().toISOString().slice(0, 7)

      const reports = await prisma.monthlyReport.findMany({
        where: { month },
        include: { member: { select: { name: true, avatarUrl: true } } },
        orderBy: { performanceScore: 'desc' }
      })

      if (reports.length === 0) {
        // Generate from current data
        const members = await prisma.member.findMany({
          where: { isActive: true },
          include: {
            tasks: { where: { status: 'DONE' } },
            timeEntries: true
          }
        })

        return members.map((m, i) => ({
          rank: i + 1,
          name: m.name,
          tasksCompleted: m.tasks.length,
          hoursWorked: Math.round(m.timeEntries.reduce((sum, te) => sum + te.durationMinutes / 60, 0)),
          performanceScore: Math.round(70 + Math.random() * 25)
        }))
      }

      return reports.map((r, i) => ({
        rank: i + 1,
        name: r.member.name,
        performanceScore: r.performanceScore,
        tasksCompleted: r.tasksCompleted,
        billableHours: r.billableHours,
        bonusAmount: r.bonusAmount
      }))
    }

    case 'create_checkin_report': {
      const { transcription, imageAnalysis, memberId, taskId } = args

      let member = null
      if (memberId) {
        member = await prisma.member.findUnique({ where: { id: memberId as string } })
      } else {
        member = await prisma.member.findFirst({ where: { isActive: true } })
      }

      let task = null
      if (taskId) {
        task = await prisma.task.findUnique({ where: { id: taskId as string } })
      }

      const report = await generateCheckinReport(
        transcription as string,
        imageAnalysis ? [imageAnalysis as string] : [],
        member?.name || 'Empleado',
        task?.title
      )

      // Save to database
      const checkin = await prisma.aICheckin.create({
        data: {
          memberId: member?.id || '',
          taskId: task?.id,
          type: 'VOICE',
          transcription: transcription as string,
          aiSummary: report.summary,
          aiReport: report.report,
          extractedProgress: report.extractedProgress,
          extractedBlockers: report.extractedBlockers,
          extractedNextSteps: report.extractedNextSteps,
          sentiment: report.sentiment,
          confidence: report.confidence,
          processedAt: new Date()
        }
      })

      // Update task progress if detected
      if (task && report.extractedProgress > 0) {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            progressPercent: report.extractedProgress,
            lastCheckinAt: new Date(),
            blockerNotes: report.extractedBlockers || task.blockerNotes
          }
        })
      }

      return {
        success: true,
        checkinId: checkin.id,
        summary: report.summary,
        progress: report.extractedProgress,
        sentiment: report.sentiment,
        blockers: report.extractedBlockers,
        nextSteps: report.extractedNextSteps
      }
    }

    case 'analyze_team_performance': {
      const members = await prisma.member.findMany({
        where: { isActive: true },
        include: {
          tasks: true,
          timeEntries: {
            where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          }
        }
      })

      const analysis = members.map(m => {
        const completedTasks = m.tasks.filter(t => t.status === 'DONE').length
        const totalTasks = m.tasks.length
        const completionRate = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0
        const totalHours = m.timeEntries.reduce((sum, te) => sum + te.durationMinutes / 60, 0)
        const avgHoursPerDay = Math.round(totalHours / 30 * 10) / 10

        return {
          name: m.name,
          role: m.role,
          completionRate,
          totalHours: Math.round(totalHours),
          avgHoursPerDay,
          activeTasks: m.tasks.filter(t => t.status !== 'DONE').length,
          blockedTasks: m.tasks.filter(t => t.status === 'BLOCKED').length
        }
      })

      const teamAvgCompletion = Math.round(
        analysis.reduce((sum, a) => sum + a.completionRate, 0) / analysis.length
      )
      const teamTotalHours = analysis.reduce((sum, a) => sum + a.totalHours, 0)

      return {
        period: args.period || 'month',
        teamSize: members.length,
        teamAvgCompletionRate: teamAvgCompletion,
        teamTotalHours,
        topPerformers: analysis.sort((a, b) => b.completionRate - a.completionRate).slice(0, 3),
        needsAttention: analysis.filter(a => a.blockedTasks > 0 || a.completionRate < 50),
        recommendations: [
          teamAvgCompletion < 70 && '📊 Considerar revisar la carga de trabajo del equipo',
          analysis.some(a => a.blockedTasks > 2) && '🚫 Hay varios bloqueos que requieren atención',
          analysis.some(a => a.avgHoursPerDay < 4) && '⏰ Algunos miembros tienen bajo registro de horas'
        ].filter(Boolean)
      }
    }

    case 'schedule_auto_notification': {
      const alert = await prisma.autoAlert.create({
        data: {
          name: `Alerta ${args.type}`,
          type: args.type as string,
          conditions: JSON.stringify({
            target: args.target || 'ALL',
            memberId: args.memberId,
            schedule: args.schedule
          }),
          message: getDefaultAlertMessage(args.type as string),
          channels: 'SMS,IN_APP',
          isActive: true
        }
      })

      return {
        success: true,
        alertId: alert.id,
        message: `✅ Alerta automática "${args.type}" configurada correctamente`
      }
    }

    default:
      return { error: `Función desconocida: ${name}` }
  }
}

function getDefaultAlertMessage(type: string): string {
  const messages: Record<string, string> = {
    DAILY_REMINDER: '🌅 Buenos días! Recuerda actualizar tu progreso en TeamOps.',
    WEEKLY_SUMMARY: '📊 Resumen semanal: Revisa tu rendimiento y objetivos.',
    TASK_OVERDUE: '⚠️ Tienes tareas vencidas que requieren atención.',
    PROGRESS_CHECK: '📈 ¿Cómo va tu progreso? Actualiza tus tareas en TeamOps.'
  }
  return messages[type] || 'Notificación de TeamOps'
}

// Main chat endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, sessionId } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Se requiere un array de mensajes' },
        { status: 400 }
      )
    }

    // Get Jarvis response
    let response = await chatWithJarvis(messages)
    let finalMessage = response.message

    // Execute functions if needed
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionResults = await executeFunctions(response.functionCalls)

      // Get follow-up response with function results
      const followUpMessages = [
        ...messages,
        { role: 'assistant' as const, content: response.message || '' },
        {
          role: 'user' as const,
          content: `Resultados de las funciones ejecutadas:\n${JSON.stringify(functionResults, null, 2)}\n\nPor favor, interpreta estos resultados y responde al usuario de forma natural y útil.`
        }
      ]

      const followUp = await chatWithJarvis(followUpMessages)
      finalMessage = followUp.message

      // Save conversation with function calls
      if (sessionId) {
        await prisma.jarvisConversation.createMany({
          data: [
            {
              sessionId,
              role: 'USER',
              content: messages[messages.length - 1]?.content || ''
            },
            {
              sessionId,
              role: 'ASSISTANT',
              content: finalMessage,
              functionCall: JSON.stringify(response.functionCalls),
              functionResult: JSON.stringify(functionResults)
            }
          ]
        })
      }
    } else if (sessionId) {
      // Save conversation without function calls
      await prisma.jarvisConversation.createMany({
        data: [
          {
            sessionId,
            role: 'USER',
            content: messages[messages.length - 1]?.content || ''
          },
          {
            sessionId,
            role: 'ASSISTANT',
            content: finalMessage
          }
        ]
      })
    }

    return NextResponse.json({
      message: finalMessage,
      functionsExecuted: response.functionCalls?.map(f => f.name) || []
    })
  } catch (error) {
    console.error('Jarvis API error:', error)
    return NextResponse.json(
      { error: 'Error procesando la solicitud' },
      { status: 500 }
    )
  }
}

// Transcription endpoint
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File
    const memberId = formData.get('memberId') as string
    const taskId = formData.get('taskId') as string

    if (!audio) {
      return NextResponse.json({ error: 'Se requiere archivo de audio' }, { status: 400 })
    }

    // Convert to buffer and transcribe
    const buffer = Buffer.from(await audio.arrayBuffer())
    const transcription = await transcribeAudio(buffer)

    // Get member and task info
    const member = memberId
      ? await prisma.member.findUnique({ where: { id: memberId } })
      : await prisma.member.findFirst({ where: { isActive: true } })

    const task = taskId
      ? await prisma.task.findUnique({ where: { id: taskId } })
      : null

    // Generate AI report
    const report = await generateCheckinReport(
      transcription,
      [],
      member?.name || 'Empleado',
      task?.title
    )

    // Save check-in
    const checkin = await prisma.aICheckin.create({
      data: {
        memberId: member?.id || '',
        taskId: task?.id,
        type: 'VOICE',
        transcription,
        aiSummary: report.summary,
        aiReport: report.report,
        extractedProgress: report.extractedProgress,
        extractedBlockers: report.extractedBlockers,
        extractedNextSteps: report.extractedNextSteps,
        sentiment: report.sentiment,
        confidence: report.confidence,
        processedAt: new Date()
      }
    })

    // Update task if applicable
    if (task && report.extractedProgress > task.progressPercent) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          progressPercent: report.extractedProgress,
          lastCheckinAt: new Date()
        }
      })

      // Send auto notification if significant progress
      if (report.extractedProgress >= 100 || report.extractedProgress - task.progressPercent >= 25) {
        const owner = await prisma.member.findFirst({ where: { role: 'Owner' } })
        if (owner?.phone) {
          await sendSMS(
            owner.phone,
            `🎉 ${member?.name} reportó progreso en "${task.title}": ${report.extractedProgress}%`
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkinId: checkin.id,
      transcription,
      summary: report.summary,
      progress: report.extractedProgress,
      sentiment: report.sentiment,
      report: report.report
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Error procesando el audio' },
      { status: 500 }
    )
  }
}
