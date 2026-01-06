import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateDeadlinePressure, calculatePriorityScore, getTaskQuadrant } from '@/lib/priority'

/**
 * GET - Retrieve daily summaries
 * POST - Generate nightly summary (called by cron job)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const managerId = searchParams.get('managerId')
  const date = searchParams.get('date') // YYYY-MM-DD
  const limit = parseInt(searchParams.get('limit') || '7')

  const where: Record<string, unknown> = {}
  if (managerId) where.managerId = managerId
  if (date) where.date = date

  const summaries = await prisma.dailySummary.findMany({
    where,
    include: { manager: { select: { id: true, name: true, email: true } } },
    orderBy: { date: 'desc' },
    take: limit
  })

  return NextResponse.json(summaries)
}

export async function POST(req: NextRequest) {
  const { managerId, date: requestDate } = await req.json()

  // Default to today's date
  const today = requestDate || new Date().toISOString().split('T')[0]
  const startOfDay = new Date(today + 'T00:00:00.000Z')
  const endOfDay = new Date(today + 'T23:59:59.999Z')
  const tomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  const in48Hours = new Date(startOfDay.getTime() + 48 * 60 * 60 * 1000)

  // Get manager(s) to generate summaries for
  const managers = managerId
    ? [await prisma.member.findUnique({ where: { id: managerId } })]
    : await prisma.member.findMany({ where: { isManager: true, isActive: true } })

  const generatedSummaries = []

  for (const manager of managers) {
    if (!manager) continue

    // ===== SECTION 1: Completed Today =====
    const completedTasks = await prisma.task.findMany({
      where: {
        completedAt: { gte: startOfDay, lte: endOfDay },
        status: 'DONE'
      },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { completedAt: 'desc' }
    })

    const completedData = completedTasks.map(t => ({
      taskId: t.id,
      title: t.title,
      memberName: t.owner.name,
      completedAt: t.completedAt?.toISOString()
    }))

    // ===== SECTION 2: Progress Updates Today =====
    // Get tasks that were updated today (check lastCheckinAt or updatedAt)
    const updatedTasks = await prisma.task.findMany({
      where: {
        updatedAt: { gte: startOfDay, lte: endOfDay },
        status: { not: 'DONE' }
      },
      include: { owner: { select: { id: true, name: true } } }
    })

    // Also get check-ins from today for progress info
    const todayCheckins = await prisma.aICheckin.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        task: true,
        member: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const progressData = updatedTasks.map(t => ({
      taskId: t.id,
      title: t.title,
      memberName: t.owner.name,
      currentProgress: t.progressPercent
    }))

    // ===== SECTION 3: Blocked Tasks =====
    const blockedTasks = await prisma.task.findMany({
      where: { status: 'BLOCKED' },
      include: { owner: { select: { id: true, name: true } } }
    })

    const blockedData = blockedTasks.map(t => ({
      taskId: t.id,
      title: t.title,
      memberName: t.owner.name,
      blockerNotes: t.blockerNotes || 'Sin descripción'
    }))

    // ===== SECTION 4: Urgent Tomorrow =====
    const urgentTasks = await prisma.task.findMany({
      where: {
        status: { not: 'DONE' },
        OR: [
          { internalDeadline: { gte: tomorrow, lte: in48Hours } },
          { externalClientDeadline: { gte: tomorrow, lte: in48Hours } },
          { dueDate: { gte: tomorrow, lte: in48Hours } },
          // Also include already overdue
          { internalDeadline: { lt: tomorrow } },
          { externalClientDeadline: { lt: tomorrow } },
          { dueDate: { lt: tomorrow } }
        ]
      },
      include: { owner: { select: { id: true, name: true } } }
    })

    const urgentData = urgentTasks.map(t => {
      const dp = calculateDeadlinePressure(t.internalDeadline, t.externalClientDeadline)
      return {
        taskId: t.id,
        title: t.title,
        dueDate: (t.externalClientDeadline || t.internalDeadline || t.dueDate)?.toISOString(),
        isClientDeadline: dp.isClientDeadline,
        daysRemaining: dp.daysRemaining,
        memberName: t.owner.name
      }
    }).sort((a, b) => (a.daysRemaining || 999) - (b.daysRemaining || 999))

    // ===== SECTION 5: Manager Actions Required =====
    const managerActions: Array<{
      type: string
      description: string
      taskId?: string
      memberId?: string
      priority: number
    }> = []

    // Action: Review client deadlines
    const clientDeadlines = urgentData.filter(t => t.isClientDeadline && (t.daysRemaining || 999) <= 2)
    for (const task of clientDeadlines.slice(0, 3)) {
      managerActions.push({
        type: 'CLIENT_DEADLINE',
        description: `Revisar: "${task.title}" - deadline cliente en ${task.daysRemaining} día(s)`,
        taskId: task.taskId,
        priority: 1
      })
    }

    // Action: Unblock tasks
    for (const blocked of blockedData.slice(0, 3)) {
      managerActions.push({
        type: 'UNBLOCK',
        description: `Desbloquear: "${blocked.title}" (${blocked.memberName}) - ${blocked.blockerNotes}`,
        taskId: blocked.taskId,
        priority: 2
      })
    }

    // Action: Cross-check with high-complexity tasks
    const highComplexity = await prisma.task.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'NOT_STARTED'] },
        complexityLevel: { gte: 4 },
        requiresMultiHand: true
      },
      include: { owner: { select: { id: true, name: true } } },
      take: 3
    })

    for (const task of highComplexity) {
      managerActions.push({
        type: 'CROSS_CHECK',
        description: `Cross-check con ${task.owner.name} sobre "${task.title}" (alta complejidad)`,
        taskId: task.id,
        memberId: task.ownerId,
        priority: 3
      })
    }

    // Sort actions by priority
    managerActions.sort((a, b) => a.priority - b.priority)

    // ===== HOURS SUMMARY =====
    const timeEntries = await prisma.timeEntry.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      include: { member: { select: { id: true, name: true } } }
    })

    const totalMinutes = timeEntries.reduce((sum, e) => sum + e.durationMinutes, 0)
    const billableMinutes = timeEntries.filter(e => e.billable).reduce((sum, e) => sum + e.durationMinutes, 0)

    const memberHours: Record<string, number> = {}
    for (const entry of timeEntries) {
      memberHours[entry.memberId] = (memberHours[entry.memberId] || 0) + (entry.durationMinutes / 60)
    }

    // ===== NARRATIVE SUMMARY =====
    const narrative = generateNarrativeSummary({
      completedCount: completedData.length,
      progressCount: progressData.length,
      blockedCount: blockedData.length,
      urgentCount: urgentData.length,
      actionsCount: managerActions.length,
      totalHours: totalMinutes / 60,
      completedTasks: completedData,
      urgentTasks: urgentData,
      blockedTasks: blockedData
    })

    // ===== SAVE SUMMARY =====
    const summary = await prisma.dailySummary.upsert({
      where: {
        date_managerId: { date: today, managerId: manager.id }
      },
      create: {
        date: today,
        managerId: manager.id,
        completedTasks: JSON.stringify(completedData),
        completedCount: completedData.length,
        progressUpdates: JSON.stringify(progressData),
        progressCount: progressData.length,
        blockedTasks: JSON.stringify(blockedData),
        blockedCount: blockedData.length,
        urgentTomorrow: JSON.stringify(urgentData),
        urgentCount: urgentData.length,
        managerActions: JSON.stringify(managerActions),
        actionsCount: managerActions.length,
        totalHoursLogged: totalMinutes / 60,
        billableHours: billableMinutes / 60,
        memberHours: JSON.stringify(memberHours),
        narrativeSummary: narrative
      },
      update: {
        completedTasks: JSON.stringify(completedData),
        completedCount: completedData.length,
        progressUpdates: JSON.stringify(progressData),
        progressCount: progressData.length,
        blockedTasks: JSON.stringify(blockedData),
        blockedCount: blockedData.length,
        urgentTomorrow: JSON.stringify(urgentData),
        urgentCount: urgentData.length,
        managerActions: JSON.stringify(managerActions),
        actionsCount: managerActions.length,
        totalHoursLogged: totalMinutes / 60,
        billableHours: billableMinutes / 60,
        memberHours: JSON.stringify(memberHours),
        narrativeSummary: narrative,
        generatedAt: new Date()
      },
      include: { manager: { select: { id: true, name: true } } }
    })

    generatedSummaries.push(summary)
  }

  return NextResponse.json({
    success: true,
    count: generatedSummaries.length,
    summaries: generatedSummaries
  })
}

function generateNarrativeSummary(data: {
  completedCount: number
  progressCount: number
  blockedCount: number
  urgentCount: number
  actionsCount: number
  totalHours: number
  completedTasks: Array<{ title: string; memberName: string }>
  urgentTasks: Array<{ title: string; daysRemaining: number | null; isClientDeadline: boolean }>
  blockedTasks: Array<{ title: string; memberName: string }>
}): string {
  const lines: string[] = []

  // Greeting
  const hour = new Date().getHours()
  if (hour < 12) {
    lines.push('Buenos días. Aquí está tu resumen del día:')
  } else if (hour < 18) {
    lines.push('Buenas tardes. Aquí está tu resumen del día:')
  } else {
    lines.push('Buenas noches. Aquí está tu resumen del día:')
  }
  lines.push('')

  // Completed today
  if (data.completedCount > 0) {
    lines.push(`✅ **${data.completedCount} tarea(s) completada(s) hoy:**`)
    for (const task of data.completedTasks.slice(0, 5)) {
      lines.push(`   - "${task.title}" por ${task.memberName}`)
    }
    if (data.completedTasks.length > 5) {
      lines.push(`   - ...y ${data.completedTasks.length - 5} más`)
    }
    lines.push('')
  } else {
    lines.push('📋 No se completaron tareas hoy.')
    lines.push('')
  }

  // Hours logged
  lines.push(`⏱️ **${data.totalHours.toFixed(1)} horas registradas** en el equipo hoy.`)
  lines.push('')

  // Urgent tomorrow
  if (data.urgentCount > 0) {
    lines.push(`⚠️ **${data.urgentCount} tarea(s) requieren atención mañana:**`)
    for (const task of data.urgentTasks.slice(0, 5)) {
      const urgency = task.isClientDeadline ? '🔴 CLIENTE' : '🟡 Interno'
      const days = task.daysRemaining !== null
        ? (task.daysRemaining <= 0 ? 'VENCIDA' : `${task.daysRemaining} día(s)`)
        : 'Sin fecha'
      lines.push(`   - ${urgency} "${task.title}" - ${days}`)
    }
    lines.push('')
  }

  // Blocked
  if (data.blockedCount > 0) {
    lines.push(`🚫 **${data.blockedCount} tarea(s) bloqueada(s):**`)
    for (const task of data.blockedTasks.slice(0, 3)) {
      lines.push(`   - "${task.title}" (${task.memberName})`)
    }
    lines.push('')
  }

  // Actions count
  if (data.actionsCount > 0) {
    lines.push(`📌 **${data.actionsCount} acción(es) requerida(s)** para mañana temprano.`)
  }

  return lines.join('\n')
}
