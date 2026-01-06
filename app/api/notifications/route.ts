import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSMS, NotificationTemplates, notifyTeamOverdueTasks } from '@/lib/sms'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId')

  const where: any = {}
  if (memberId) where.memberId = memberId

  const notifications = await prisma.notification.findMany({
    where,
    include: {
      member: { select: { id: true, name: true } },
      sentBy: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return NextResponse.json(notifications)
}

// Send a custom notification
export async function POST(req: NextRequest) {
  const { memberId, type, message, sendToAll, sentById } = await req.json()

  if (sendToAll) {
    // Send to all active members
    const members = await prisma.member.findMany({ where: { isActive: true } })
    const results = []

    for (const member of members) {
      const success = await sendSMS({
        memberId: member.id,
        type: type || 'PROGRESS_UPDATE',
        message,
        sentById
      })
      results.push({ memberId: member.id, name: member.name, success })
    }

    return NextResponse.json({ sent: results.filter(r => r.success).length, total: members.length, results })
  } else {
    // Send to specific member
    const success = await sendSMS({
      memberId,
      type: type || 'PROGRESS_UPDATE',
      message,
      sentById
    })

    return NextResponse.json({ success })
  }
}

// Trigger automated notifications
export async function PUT(req: NextRequest) {
  const { action } = await req.json()

  switch (action) {
    case 'NOTIFY_OVERDUE':
      const overdueCount = await notifyTeamOverdueTasks()
      return NextResponse.json({ action, sent: overdueCount })

    case 'NOTIFY_NO_CHECKIN':
      // Find members with no recent check-in
      const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const staleMembers = await prisma.member.findMany({
        where: {
          isActive: true,
          tasks: {
            some: {
              status: { in: ['IN_PROGRESS', 'BLOCKED'] },
              OR: [
                { lastCheckinAt: null },
                { lastCheckinAt: { lt: threshold } }
              ]
            }
          }
        }
      })

      for (const member of staleMembers) {
        await sendSMS({
          memberId: member.id,
          type: 'PROGRESS_UPDATE',
          message: NotificationTemplates.noCheckin(member.name, 24)
        })
      }

      return NextResponse.json({ action, sent: staleMembers.length })

    case 'NOTIFY_BLOCKERS':
      const blockedTasks = await prisma.task.findMany({
        where: { status: 'BLOCKED' },
        include: { owner: true }
      })

      // Notify admin about all blockers
      const admins = await prisma.member.findMany({
        where: { role: { contains: 'Lead' } }
      })

      for (const task of blockedTasks) {
        for (const admin of admins) {
          await sendSMS({
            memberId: admin.id,
            type: 'BLOCKER_ALERT',
            message: NotificationTemplates.blockerAlert(
              task.owner.name,
              task.title,
              task.blockerNotes || 'No details'
            )
          })
        }
      }

      return NextResponse.json({ action, blockers: blockedTasks.length })

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
