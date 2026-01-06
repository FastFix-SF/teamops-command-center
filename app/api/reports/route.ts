import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSMS, NotificationTemplates, notifyLeaderboardChanges } from '@/lib/sms'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const reports = await prisma.monthlyReport.findMany({
    where: { month },
    include: { member: { select: { id: true, name: true, role: true } } },
    orderBy: { performanceScore: 'desc' }
  })

  // Add rank
  const ranked = reports.map((r, i) => ({ ...r, rank: i + 1 }))

  return NextResponse.json(ranked)
}

// Generate/Update monthly reports for all members
export async function POST(req: NextRequest) {
  const { month, sendNotifications } = await req.json()
  const targetMonth = month || new Date().toISOString().slice(0, 7)

  const [year, m] = targetMonth.split('-').map(Number)
  const startDate = new Date(year, m - 1, 1)
  const endDate = new Date(year, m, 0)

  // Get settings
  const settings = await prisma.setting.findMany()
  const getSetting = (key: string, def: number) => {
    const s = settings.find(s => s.key === key)
    return s ? parseFloat(s.value) : def
  }

  const bonusRate = getSetting('bonus_rate_per_hour', 25)

  const members = await prisma.member.findMany({ where: { isActive: true } })
  const reports = []

  for (const member of members) {
    // Time entries
    const timeEntries = await prisma.timeEntry.findMany({
      where: { memberId: member.id, date: { gte: startDate, lte: endDate } }
    })

    const totalMinutes = timeEntries.reduce((sum, e) => sum + e.durationMinutes, 0)
    const totalHours = totalMinutes / 60
    const billableMinutes = timeEntries.filter(e => e.billable).reduce((sum, e) => sum + e.durationMinutes, 0)
    const billableHours = billableMinutes / 60
    const valueGenerated = timeEntries
      .filter(e => e.billable && e.hourlyRate)
      .reduce((sum, e) => sum + (e.durationMinutes / 60) * (e.hourlyRate || 0), 0)

    // Tasks
    const tasksCompleted = await prisma.task.count({
      where: { ownerId: member.id, status: 'DONE', completedAt: { gte: startDate, lte: endDate } }
    })

    const tasksAssigned = await prisma.task.count({
      where: { ownerId: member.id, createdAt: { lte: endDate } }
    })

    // On-time rate
    const completedTasks = await prisma.task.findMany({
      where: { ownerId: member.id, status: 'DONE', completedAt: { gte: startDate, lte: endDate } },
      select: { dueDate: true, completedAt: true }
    })

    const onTimeTasks = completedTasks.filter(t => {
      if (!t.dueDate || !t.completedAt) return true
      return t.completedAt <= t.dueDate
    })

    const onTimeRate = completedTasks.length > 0 ? (onTimeTasks.length / completedTasks.length) * 100 : 100

    // Scores
    const deliveryScore = Math.min(40, (onTimeRate / 100) * 40)

    const highPriorityCompleted = await prisma.task.count({
      where: { ownerId: member.id, status: 'DONE', priority: { in: ['P0', 'P1'] }, completedAt: { gte: startDate, lte: endDate } }
    })

    const progressScore = Math.min(40, tasksCompleted * 5 + highPriorityCompleted * 5 + billableHours / 4)

    // Improvement score (compare to previous month)
    const prevMonth = `${m === 1 ? year - 1 : year}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`
    const prevReport = await prisma.monthlyReport.findUnique({
      where: { month_memberId: { month: prevMonth, memberId: member.id } }
    })

    let improvementScore = 10
    if (prevReport) {
      const improvement = (onTimeRate - prevReport.onTimeRate) / 10 + (tasksCompleted - prevReport.tasksCompleted)
      improvementScore = Math.min(20, Math.max(0, 10 + improvement))
    }

    const performanceScore = deliveryScore + progressScore + improvementScore
    const bonusAmount = billableHours * bonusRate * (1 + performanceScore / 100)

    const report = await prisma.monthlyReport.upsert({
      where: { month_memberId: { month: targetMonth, memberId: member.id } },
      update: {
        totalHours, billableHours, valueGenerated, tasksCompleted, tasksAssigned,
        onTimeRate, deliveryScore, progressScore, improvementScore, performanceScore, bonusAmount
      },
      create: {
        month: targetMonth, memberId: member.id,
        totalHours, billableHours, valueGenerated, tasksCompleted, tasksAssigned,
        onTimeRate, deliveryScore, progressScore, improvementScore, performanceScore, bonusAmount
      },
      include: { member: { select: { id: true, name: true } } }
    })

    reports.push(report)
  }

  // Assign ranks
  reports.sort((a, b) => b.performanceScore - a.performanceScore)
  for (let i = 0; i < reports.length; i++) {
    await prisma.monthlyReport.update({
      where: { id: reports[i].id },
      data: { rank: i + 1 }
    })
    reports[i].rank = i + 1
  }

  // Send leaderboard notifications
  if (sendNotifications) {
    await notifyLeaderboardChanges()
  }

  return NextResponse.json(reports)
}
