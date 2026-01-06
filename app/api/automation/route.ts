import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSMS } from '@/lib/sms'

// Automated task monitoring and notifications
// This endpoint should be called by a cron job (e.g., every hour)

interface Alert {
  type: string
  memberId: string
  memberName: string
  memberPhone: string | null
  message: string
  taskId?: string
  taskTitle?: string
}

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const alerts: Alert[] = []

    // 1. Check for overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { not: 'DONE' }
      },
      include: {
        owner: { select: { id: true, name: true, phone: true, notifyOnOverdue: true } }
      }
    })

    for (const task of overdueTasks) {
      if (task.owner.notifyOnOverdue && task.owner.phone) {
        const daysPastDue = Math.floor((now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24))
        alerts.push({
          type: 'TASK_OVERDUE',
          memberId: task.owner.id,
          memberName: task.owner.name,
          memberPhone: task.owner.phone,
          taskId: task.id,
          taskTitle: task.title,
          message: `⚠️ Tarea vencida hace ${daysPastDue} día(s): "${task.title}". Por favor actualiza tu progreso en TeamOps.`
        })
      }
    }

    // 2. Check for stalled tasks (no check-in in 48+ hours)
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const stalledTasks = await prisma.task.findMany({
      where: {
        status: 'IN_PROGRESS',
        OR: [
          { lastCheckinAt: { lt: twoDaysAgo } },
          { lastCheckinAt: null, updatedAt: { lt: twoDaysAgo } }
        ]
      },
      include: {
        owner: { select: { id: true, name: true, phone: true } }
      }
    })

    for (const task of stalledTasks) {
      if (task.owner.phone) {
        alerts.push({
          type: 'PROGRESS_STALL',
          memberId: task.owner.id,
          memberName: task.owner.name,
          memberPhone: task.owner.phone,
          taskId: task.id,
          taskTitle: task.title,
          message: `📊 No has actualizado "${task.title}" en más de 48 horas. ¿Cómo va tu progreso? Usa JARVIS para hacer un check-in rápido.`
        })
      }
    }

    // 3. Check for blocked tasks needing attention
    const blockedTasks = await prisma.task.findMany({
      where: {
        status: 'BLOCKED',
        updatedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      },
      include: {
        owner: { select: { id: true, name: true, phone: true } }
      }
    })

    // Notify owner about blocked tasks
    const owner = await prisma.member.findFirst({
      where: { role: { contains: 'Owner' } },
      select: { id: true, name: true, phone: true }
    })

    if (owner?.phone && blockedTasks.length > 0) {
      alerts.push({
        type: 'BLOCKED_ALERT',
        memberId: owner.id,
        memberName: owner.name,
        memberPhone: owner.phone,
        message: `🚫 Hay ${blockedTasks.length} tarea(s) bloqueada(s) que requieren atención: ${blockedTasks.map(t => `"${t.title}" (${t.owner.name})`).join(', ')}`
      })
    }

    // 4. Daily standup reminder (if it's 9 AM local time)
    const hour = now.getHours()
    if (hour === 9) {
      const upcomingMeetings = await prisma.meeting.findFirst({
        where: {
          type: 'DAILY_STANDUP',
          startTime: {
            gte: now,
            lt: new Date(now.getTime() + 2 * 60 * 60 * 1000)
          },
          status: 'SCHEDULED'
        }
      })

      if (upcomingMeetings) {
        const members = await prisma.member.findMany({
          where: { isActive: true, notifyOnMeeting: true, phone: { not: null } }
        })

        for (const member of members) {
          if (member.phone) {
            alerts.push({
              type: 'MEETING_REMINDER',
              memberId: member.id,
              memberName: member.name,
              memberPhone: member.phone,
              message: `📅 Recordatorio: Daily Standup en 30 minutos. Prepara tu actualización de progreso.`
            })
          }
        }
      }
    }

    // 5. Send notifications and save to database
    const results = []
    for (const alert of alerts) {
      // Check if we already sent this notification recently (avoid spam)
      const recentNotification = await prisma.notification.findFirst({
        where: {
          memberId: alert.memberId,
          type: alert.type,
          createdAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) } // 12 hour window
        }
      })

      if (recentNotification) continue

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          memberId: alert.memberId,
          type: alert.type,
          channel: 'SMS',
          subject: `TeamOps: ${alert.type}`,
          message: alert.message,
          status: 'PENDING'
        }
      })

      // Send SMS
      if (alert.memberPhone) {
        const sent = await sendSMS(alert.memberPhone, alert.message)
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: sent ? 'SENT' : 'FAILED',
            sentAt: sent ? new Date() : null
          }
        })

        results.push({
          type: alert.type,
          member: alert.memberName,
          sent,
          message: alert.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      alertsProcessed: results.length,
      alerts: results
    })
  } catch (error) {
    console.error('Automation error:', error)
    return NextResponse.json(
      { error: 'Error en el proceso de automatización' },
      { status: 500 }
    )
  }
}

// Manual trigger for specific alert type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, memberId, message } = body

    const member = memberId
      ? await prisma.member.findUnique({ where: { id: memberId } })
      : null

    if (type === 'BROADCAST') {
      // Send to all active members
      const members = await prisma.member.findMany({
        where: { isActive: true, phone: { not: null } }
      })

      const results = []
      for (const m of members) {
        if (m.phone) {
          const sent = await sendSMS(m.phone, message)
          await prisma.notification.create({
            data: {
              memberId: m.id,
              type: 'BROADCAST',
              channel: 'SMS',
              subject: 'Mensaje del equipo',
              message,
              status: sent ? 'SENT' : 'FAILED',
              sentAt: sent ? new Date() : null
            }
          })
          results.push({ name: m.name, sent })
        }
      }

      return NextResponse.json({ success: true, results })
    }

    if (member?.phone) {
      const sent = await sendSMS(member.phone, message)
      await prisma.notification.create({
        data: {
          memberId: member.id,
          type: type || 'CUSTOM',
          channel: 'SMS',
          subject: 'Notificación TeamOps',
          message,
          status: sent ? 'SENT' : 'FAILED',
          sentAt: sent ? new Date() : null
        }
      })

      return NextResponse.json({ success: sent, member: member.name })
    }

    return NextResponse.json(
      { error: 'Miembro no encontrado o sin teléfono' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Manual notification error:', error)
    return NextResponse.json(
      { error: 'Error enviando notificación' },
      { status: 500 }
    )
  }
}
