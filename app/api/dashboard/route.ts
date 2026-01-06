import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const now = new Date()
  const twoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const currentMonth = now.toISOString().slice(0, 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // Task counts
  const [totalTasks, activeTasks, completedTasks, overdueTasks, blockedTasks] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({ where: { status: { not: 'DONE' } } }),
    prisma.task.count({ where: { status: 'DONE' } }),
    prisma.task.count({ where: { dueDate: { lt: now }, status: { not: 'DONE' } } }),
    prisma.task.count({ where: { status: 'BLOCKED' } })
  ])

  // Overdue task details
  const overdueTasksList = await prisma.task.findMany({
    where: { dueDate: { lt: now }, status: { not: 'DONE' } },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { dueDate: 'asc' },
    take: 10
  })

  // Due soon tasks
  const dueSoonTasks = await prisma.task.findMany({
    where: { dueDate: { gte: now, lte: twoDays }, status: { not: 'DONE' } },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { dueDate: 'asc' },
    take: 10
  })

  // Blocked tasks
  const blockedTasksList = await prisma.task.findMany({
    where: { status: 'BLOCKED' },
    include: { owner: { select: { id: true, name: true } } },
    take: 10
  })

  // Current focus
  const currentFocus = await prisma.task.findMany({
    where: { currentFocus: true, status: { not: 'DONE' } },
    include: { owner: { select: { id: true, name: true } } }
  })

  // Recent completions (48h)
  const recentlyCompleted = await prisma.task.findMany({
    where: { status: 'DONE', completedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { completedAt: 'desc' },
    take: 10
  })

  // Team summary
  const members = await prisma.member.findMany({ where: { isActive: true } })
  const memberStats = await Promise.all(members.map(async (m) => {
    const [active, overdue, blocked, dueSoon] = await Promise.all([
      prisma.task.count({ where: { ownerId: m.id, status: { not: 'DONE' } } }),
      prisma.task.count({ where: { ownerId: m.id, dueDate: { lt: now }, status: { not: 'DONE' } } }),
      prisma.task.count({ where: { ownerId: m.id, status: 'BLOCKED' } }),
      prisma.task.count({ where: { ownerId: m.id, dueDate: { gte: now, lte: twoDays }, status: { not: 'DONE' } } })
    ])

    const avgProgress = await prisma.task.aggregate({
      where: { ownerId: m.id, status: { not: 'DONE' } },
      _avg: { progressPercent: true }
    })

    const hoursThisMonth = await prisma.timeEntry.aggregate({
      where: { memberId: m.id, date: { gte: monthStart, lte: monthEnd } },
      _sum: { durationMinutes: true }
    })

    return {
      id: m.id,
      name: m.name,
      role: m.role,
      activeTasks: active,
      overdueTasks: overdue,
      blockedTasks: blocked,
      dueSoonTasks: dueSoon,
      avgProgress: avgProgress._avg.progressPercent || 0,
      hoursThisMonth: (hoursThisMonth._sum.durationMinutes || 0) / 60
    }
  }))

  // Time tracking summary
  const [totalHours, billableHours] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { durationMinutes: true }
    }),
    prisma.timeEntry.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd }, billable: true },
      _sum: { durationMinutes: true }
    })
  ])

  // Leaderboard
  const leaderboard = await prisma.monthlyReport.findMany({
    where: { month: currentMonth },
    include: { member: { select: { id: true, name: true } } },
    orderBy: { performanceScore: 'desc' },
    take: 5
  })

  // Recent meetings
  const recentMeetings = await prisma.meeting.findMany({
    include: { createdBy: { select: { name: true } }, _count: { select: { responses: true } } },
    orderBy: { startTime: 'desc' },
    take: 5
  })

  // Recent notifications
  const recentNotifications = await prisma.notification.findMany({
    include: { member: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  return NextResponse.json({
    stats: {
      totalTasks,
      activeTasks,
      completedTasks,
      overdueTasks,
      blockedTasks,
      hoursThisMonth: (totalHours._sum.durationMinutes || 0) / 60,
      billableHoursThisMonth: (billableHours._sum.durationMinutes || 0) / 60
    },
    overdueTasksList,
    dueSoonTasks,
    blockedTasksList,
    currentFocus,
    recentlyCompleted,
    memberStats,
    leaderboard,
    recentMeetings,
    recentNotifications
  })
}
