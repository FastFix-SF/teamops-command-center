import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSMS, NotificationTemplates } from '@/lib/sms'
import {
  calculatePriorityScore,
  calculateDeadlinePressure,
  getTaskQuadrant,
  getAssignmentRecommendation,
  shouldFlagImmediate,
  groupTasksByQuadrant,
  suggestOwner,
  type Quadrant
} from '@/lib/priority'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view')
  const ownerId = searchParams.get('ownerId')
  const quadrant = searchParams.get('quadrant') as Quadrant | null
  const duration = searchParams.get('duration') // XS, S, M, L, XL
  const deadlineType = searchParams.get('deadlineType') // internal, client, all

  const where: Record<string, unknown> = {}
  if (ownerId) where.ownerId = ownerId

  // Standard views
  if (view === 'urgent') {
    where.OR = [
      { priority: 'P0', status: { not: 'DONE' } },
      { urgencyLevel: { gte: 4 }, status: { not: 'DONE' } },
      { dueDate: { lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }, status: { not: 'DONE' } },
      { internalDeadline: { lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }, status: { not: 'DONE' } },
      { externalClientDeadline: { lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }, status: { not: 'DONE' } },
      { status: 'BLOCKED' }
    ]
  } else if (view === 'overdue') {
    where.OR = [
      { dueDate: { lt: new Date() }, status: { not: 'DONE' } },
      { internalDeadline: { lt: new Date() }, status: { not: 'DONE' } },
      { externalClientDeadline: { lt: new Date() }, status: { not: 'DONE' } }
    ]
  } else if (view === 'blocked') {
    where.status = 'BLOCKED'
  } else if (view === 'flagged') {
    where.flaggedImmediate = true
    where.status = { not: 'DONE' }
  } else if (view === 'pinned') {
    where.pinnedByManager = true
    where.status = { not: 'DONE' }
  } else if (view === 'multi-hand') {
    where.requiresMultiHand = true
    where.status = { not: 'DONE' }
  }

  // Duration filter
  if (duration) {
    where.estimatedDuration = duration
  }

  // Deadline type filter
  if (deadlineType === 'client') {
    where.externalClientDeadline = { not: null }
  } else if (deadlineType === 'internal') {
    where.internalDeadline = { not: null }
    where.externalClientDeadline = null
  }

  const tasks = await prisma.task.findMany({
    where,
    include: { owner: { select: { id: true, name: true, role: true } } },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }]
  })

  // Enrich tasks with computed fields
  const enrichedTasks = tasks.map(task => {
    const deadlinePressure = calculateDeadlinePressure(
      task.internalDeadline,
      task.externalClientDeadline
    )
    const priorityScore = calculatePriorityScore(task as any)
    const taskQuadrant = getTaskQuadrant(task as any)

    return {
      ...task,
      // Computed fields
      _computed: {
        priorityScore,
        quadrant: taskQuadrant,
        deadlinePressure: deadlinePressure.score,
        daysRemaining: deadlinePressure.daysRemaining,
        isClientDeadline: deadlinePressure.isClientDeadline
      }
    }
  })

  // Sort by priority score (highest first)
  enrichedTasks.sort((a, b) => b._computed.priorityScore - a._computed.priorityScore)

  // If grid view requested, group by quadrant
  if (view === 'grid') {
    const grouped = groupTasksByQuadrant(enrichedTasks as any)

    // Filter by specific quadrant if requested
    if (quadrant && grouped[quadrant]) {
      return NextResponse.json({
        view: 'grid',
        quadrant,
        tasks: grouped[quadrant].map(t => enrichedTasks.find(et => et.id === t.id))
      })
    }

    return NextResponse.json({
      view: 'grid',
      quadrants: {
        DO_NOW: enrichedTasks.filter(t => t._computed.quadrant === 'DO_NOW'),
        SCHEDULE: enrichedTasks.filter(t => t._computed.quadrant === 'SCHEDULE'),
        DELEGATE: enrichedTasks.filter(t => t._computed.quadrant === 'DELEGATE'),
        ELIMINATE: enrichedTasks.filter(t => t._computed.quadrant === 'ELIMINATE')
      },
      stats: {
        total: enrichedTasks.length,
        doNow: enrichedTasks.filter(t => t._computed.quadrant === 'DO_NOW').length,
        schedule: enrichedTasks.filter(t => t._computed.quadrant === 'SCHEDULE').length,
        delegate: enrichedTasks.filter(t => t._computed.quadrant === 'DELEGATE').length,
        eliminate: enrichedTasks.filter(t => t._computed.quadrant === 'ELIMINATE').length,
        flagged: enrichedTasks.filter(t => t.flaggedImmediate).length,
        multiHand: enrichedTasks.filter(t => t.requiresMultiHand).length
      }
    })
  }

  return NextResponse.json(enrichedTasks)
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  // Parse dates
  const taskData = {
    ...data,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    internalDeadline: data.internalDeadline ? new Date(data.internalDeadline) : null,
    externalClientDeadline: data.externalClientDeadline ? new Date(data.externalClientDeadline) : null
  }

  // Calculate if it should be flagged as immediate
  const flagCheck = shouldFlagImmediate({
    urgencyLevel: taskData.urgencyLevel || 3,
    importanceLevel: taskData.importanceLevel || 3,
    internalDeadline: taskData.internalDeadline,
    externalClientDeadline: taskData.externalClientDeadline,
    status: 'NOT_STARTED',
    complexityLevel: taskData.complexityLevel || 3,
    estimatedDuration: taskData.estimatedDuration || 'M',
    durabilityCategory: taskData.durabilityCategory || 'SHORT',
    progressPercent: 0,
    id: ''
  })

  if (flagCheck.flag) {
    taskData.flaggedImmediate = true
  }

  // Get assignment recommendation
  const recommendation = getAssignmentRecommendation({
    id: '',
    urgencyLevel: taskData.urgencyLevel || 3,
    importanceLevel: taskData.importanceLevel || 3,
    internalDeadline: taskData.internalDeadline,
    externalClientDeadline: taskData.externalClientDeadline,
    estimatedDuration: taskData.estimatedDuration || 'M',
    durabilityCategory: taskData.durabilityCategory || 'SHORT',
    complexityLevel: taskData.complexityLevel || 3,
    status: 'NOT_STARTED',
    progressPercent: 0
  })

  taskData.requiresMultiHand = recommendation.requiresMultiHand
  taskData.recommendedCadence = recommendation.suggestedCadence
  taskData.recommendedPlan = JSON.stringify(recommendation.suggestedPlan)

  // If no owner specified, suggest one
  if (!taskData.ownerId && taskData.skillTags) {
    const members = await prisma.member.findMany({
      where: { isActive: true },
      include: { _count: { select: { tasks: { where: { status: { not: 'DONE' } } } } } }
    })

    const suggested = suggestOwner(
      { skillTags: taskData.skillTags, complexityLevel: taskData.complexityLevel || 3 },
      members as any,
      recommendation
    )

    if (suggested) {
      taskData.recommendedOwnerId = suggested.memberId
      taskData.assignmentConfidence = suggested.confidence
    }
  }

  const task = await prisma.task.create({
    data: taskData,
    include: { owner: { select: { id: true, name: true, role: true } } }
  })

  return NextResponse.json(task, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()

  // Check if task is being completed
  const oldTask = await prisma.task.findUnique({ where: { id }, include: { owner: true } })
  const isCompleting = oldTask?.status !== 'DONE' && data.status === 'DONE'

  // Parse dates
  const updateData: Record<string, unknown> = {
    ...data,
    dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
    internalDeadline: data.internalDeadline !== undefined ? (data.internalDeadline ? new Date(data.internalDeadline) : null) : undefined,
    externalClientDeadline: data.externalClientDeadline !== undefined ? (data.externalClientDeadline ? new Date(data.externalClientDeadline) : null) : undefined,
    completedAt: isCompleting ? new Date() : undefined,
    progressPercent: isCompleting ? 100 : data.progressPercent,
    lastCheckinAt: new Date()
  }

  // Re-check if it should be flagged as immediate when priorities change
  if (data.urgencyLevel !== undefined || data.importanceLevel !== undefined ||
      data.internalDeadline !== undefined || data.externalClientDeadline !== undefined) {
    const checkTask = {
      ...oldTask,
      ...updateData,
      urgencyLevel: data.urgencyLevel ?? oldTask?.urgencyLevel ?? 3,
      importanceLevel: data.importanceLevel ?? oldTask?.importanceLevel ?? 3,
      internalDeadline: updateData.internalDeadline ?? oldTask?.internalDeadline,
      externalClientDeadline: updateData.externalClientDeadline ?? oldTask?.externalClientDeadline,
      complexityLevel: data.complexityLevel ?? oldTask?.complexityLevel ?? 3,
      estimatedDuration: data.estimatedDuration ?? oldTask?.estimatedDuration ?? 'M',
      durabilityCategory: data.durabilityCategory ?? oldTask?.durabilityCategory ?? 'SHORT'
    }

    const flagCheck = shouldFlagImmediate(checkTask as any)
    updateData.flaggedImmediate = flagCheck.flag

    // Re-calculate recommendations
    const recommendation = getAssignmentRecommendation(checkTask as any)
    updateData.requiresMultiHand = recommendation.requiresMultiHand
    updateData.recommendedCadence = recommendation.suggestedCadence
    updateData.recommendedPlan = JSON.stringify(recommendation.suggestedPlan)
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: { owner: { select: { id: true, name: true, role: true } } }
  })

  // Send celebration SMS on completion
  if (isCompleting && oldTask) {
    await sendSMS({
      memberId: task.ownerId,
      type: 'ACHIEVEMENT',
      message: NotificationTemplates.progressCelebration(oldTask.owner.name, task.title)
    })
  }

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
