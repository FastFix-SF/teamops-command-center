/**
 * Priority Grid - 4-Factor Prioritization System
 *
 * Factors:
 * 1. URGENCY (1-5): How immediate is it?
 * 2. IMPORTANCE (1-5): How much it matters to business outcomes
 * 3. DEADLINE PRESSURE: Based on closest deadline (internal or client)
 * 4. DURABILITY/DURATION: How long the task takes (affects assignment strategy)
 */

// Duration mapping to hours for calculations
export const DURATION_HOURS: Record<string, number> = {
  'XS': 0.5,   // < 1 hour
  'S': 2,      // 1-4 hours
  'M': 6,      // 4-8 hours
  'L': 16,     // 1-3 days
  'XL': 40     // 3+ days
}

export const DURATION_LABELS: Record<string, string> = {
  'XS': 'Muy corta (<1h)',
  'S': 'Corta (1-4h)',
  'M': 'Media (4-8h)',
  'L': 'Larga (1-3 días)',
  'XL': 'Muy larga (3+ días)'
}

export const DURABILITY_LABELS: Record<string, string> = {
  'SHORT': 'Corto plazo (<1 día)',
  'MEDIUM': 'Mediano plazo (1-5 días)',
  'LONG': 'Largo plazo (5+ días)'
}

export const URGENCY_LABELS: Record<number, string> = {
  1: 'Muy baja',
  2: 'Baja',
  3: 'Media',
  4: 'Alta',
  5: 'Crítica'
}

export const IMPORTANCE_LABELS: Record<number, string> = {
  1: 'Mínima',
  2: 'Baja',
  3: 'Media',
  4: 'Alta',
  5: 'Crítica'
}

export const COMPLEXITY_LABELS: Record<number, string> = {
  1: 'Trivial',
  2: 'Simple',
  3: 'Moderada',
  4: 'Compleja',
  5: 'Muy compleja'
}

// Quadrant definitions for Eisenhower-style grid
export type Quadrant = 'DO_NOW' | 'SCHEDULE' | 'DELEGATE' | 'ELIMINATE'

export const QUADRANT_LABELS: Record<Quadrant, { label: string; description: string; color: string }> = {
  'DO_NOW': {
    label: 'Hacer ahora',
    description: 'Urgente e importante - requiere atención inmediata',
    color: 'red'
  },
  'SCHEDULE': {
    label: 'Programar',
    description: 'Importante pero no urgente - planificar para después',
    color: 'blue'
  },
  'DELEGATE': {
    label: 'Delegar',
    description: 'Urgente pero menos importante - asignar a otro',
    color: 'amber'
  },
  'ELIMINATE': {
    label: 'Eliminar/Posponer',
    description: 'Ni urgente ni importante - reconsiderar prioridad',
    color: 'gray'
  }
}

interface Task {
  id: string
  urgencyLevel: number
  importanceLevel: number
  internalDeadline: Date | null
  externalClientDeadline: Date | null
  estimatedDuration: string
  durabilityCategory: string
  complexityLevel: number
  status: string
  progressPercent: number
}

/**
 * Calculate deadline pressure score (0-100)
 * Higher score = more pressure (closer deadline)
 */
export function calculateDeadlinePressure(
  internalDeadline: Date | null,
  externalClientDeadline: Date | null,
  now: Date = new Date()
): { score: number; daysRemaining: number | null; isClientDeadline: boolean } {
  const deadlines: { date: Date; isClient: boolean }[] = []

  if (internalDeadline) deadlines.push({ date: new Date(internalDeadline), isClient: false })
  if (externalClientDeadline) deadlines.push({ date: new Date(externalClientDeadline), isClient: true })

  if (deadlines.length === 0) {
    return { score: 0, daysRemaining: null, isClientDeadline: false }
  }

  // Find the closest deadline
  deadlines.sort((a, b) => a.date.getTime() - b.date.getTime())
  const closest = deadlines[0]

  const msRemaining = closest.date.getTime() - now.getTime()
  const daysRemaining = msRemaining / (1000 * 60 * 60 * 24)

  let score: number
  if (daysRemaining <= 0) {
    // Overdue
    score = 100
  } else if (daysRemaining <= 1) {
    // Due within 24 hours
    score = 95
  } else if (daysRemaining <= 2) {
    // Due within 48 hours
    score = 85
  } else if (daysRemaining <= 3) {
    score = 70
  } else if (daysRemaining <= 7) {
    score = 50
  } else if (daysRemaining <= 14) {
    score = 30
  } else if (daysRemaining <= 30) {
    score = 15
  } else {
    score = 5
  }

  // Client deadlines add 10% pressure
  if (closest.isClient) {
    score = Math.min(100, score * 1.1)
  }

  return {
    score,
    daysRemaining: Math.ceil(daysRemaining),
    isClientDeadline: closest.isClient
  }
}

/**
 * Calculate the overall priority score (0-100)
 * Used for sorting and ranking tasks
 */
export function calculatePriorityScore(task: Task): number {
  const { score: deadlinePressure } = calculateDeadlinePressure(
    task.internalDeadline,
    task.externalClientDeadline
  )

  // Weights for each factor
  const WEIGHTS = {
    urgency: 0.30,      // 30%
    importance: 0.30,   // 30%
    deadline: 0.30,     // 30%
    duration: 0.10      // 10% (shorter tasks get slight priority boost)
  }

  // Normalize urgency and importance to 0-100
  const urgencyScore = (task.urgencyLevel / 5) * 100
  const importanceScore = (task.importanceLevel / 5) * 100

  // Duration score - shorter tasks get higher score (quicker wins)
  const durationScore = {
    'XS': 100,
    'S': 80,
    'M': 60,
    'L': 40,
    'XL': 20
  }[task.estimatedDuration] || 50

  const score = (
    urgencyScore * WEIGHTS.urgency +
    importanceScore * WEIGHTS.importance +
    deadlinePressure * WEIGHTS.deadline +
    durationScore * WEIGHTS.duration
  )

  return Math.round(score)
}

/**
 * Determine which quadrant a task belongs to
 */
export function getTaskQuadrant(task: Task): Quadrant {
  const urgentThreshold = 3.5
  const importantThreshold = 3.5

  const isUrgent = task.urgencyLevel >= urgentThreshold
  const isImportant = task.importanceLevel >= importantThreshold

  if (isUrgent && isImportant) return 'DO_NOW'
  if (!isUrgent && isImportant) return 'SCHEDULE'
  if (isUrgent && !isImportant) return 'DELEGATE'
  return 'ELIMINATE'
}

/**
 * Get assignment recommendation based on task characteristics
 */
export interface AssignmentRecommendation {
  requiresMultiHand: boolean
  recommendedSeniority: number // 1-5
  suggestedCadence: 'HOURLY' | 'DAILY' | 'WEEKLY'
  suggestedCollaborators: number // how many additional people
  reasoning: string[]
  suggestedPlan: string[]
}

export function getAssignmentRecommendation(task: Task): AssignmentRecommendation {
  const recommendation: AssignmentRecommendation = {
    requiresMultiHand: false,
    recommendedSeniority: 2,
    suggestedCadence: 'DAILY',
    suggestedCollaborators: 0,
    reasoning: [],
    suggestedPlan: []
  }

  const { score: deadlinePressure, daysRemaining, isClientDeadline } = calculateDeadlinePressure(
    task.internalDeadline,
    task.externalClientDeadline
  )

  // Rule 1: Very urgent + Very complex = Multi-hand analysis
  if (task.urgencyLevel >= 4 && task.complexityLevel >= 4) {
    recommendation.requiresMultiHand = true
    recommendation.suggestedCollaborators = 1
    recommendation.recommendedSeniority = 4
    recommendation.reasoning.push('Alta urgencia + alta complejidad requiere análisis conjunto')
    recommendation.suggestedPlan.push('Reunión de kick-off de 15 min con equipo')
    recommendation.suggestedPlan.push('Dividir en subtareas con responsables')
  }

  // Rule 2: Important + Hard + Long-term = Senior + Assistant combo
  if (task.importanceLevel >= 4 && task.complexityLevel >= 4 && task.durabilityCategory === 'LONG') {
    recommendation.requiresMultiHand = true
    recommendation.suggestedCollaborators = 1
    recommendation.recommendedSeniority = 4
    recommendation.reasoning.push('Tarea importante y compleja de largo plazo: senior supervisa, asistente ejecuta')
    recommendation.suggestedPlan.push('Senior define arquitectura/enfoque inicial')
    recommendation.suggestedPlan.push('Asistente ejecuta con revisiones periódicas')
    recommendation.suggestedPlan.push('Check-in semanal de progreso')
  }

  // Rule 3: Urgent with client deadline in 1-2 days
  if (isClientDeadline && daysRemaining !== null && daysRemaining <= 2) {
    recommendation.suggestedCadence = 'HOURLY'
    recommendation.reasoning.push('Deadline de cliente en menos de 48h: requiere check-ins frecuentes')
    recommendation.suggestedPlan.push('Confirmar entregables exactos con cliente')
    recommendation.suggestedPlan.push('Check-in cada 2 horas hasta entrega')

    if (task.complexityLevel >= 3) {
      recommendation.requiresMultiHand = true
      recommendation.suggestedCollaborators = Math.max(recommendation.suggestedCollaborators, 1)
      recommendation.reasoning.push('Complejidad + deadline corto: considerar apoyo adicional')
    }
  }

  // Rule 4: Set cadence based on deadline pressure
  if (deadlinePressure >= 85) {
    recommendation.suggestedCadence = 'HOURLY'
  } else if (deadlinePressure >= 50) {
    recommendation.suggestedCadence = 'DAILY'
  } else {
    recommendation.suggestedCadence = 'WEEKLY'
  }

  // Rule 5: Set seniority based on complexity
  if (task.complexityLevel >= 4) {
    recommendation.recommendedSeniority = Math.max(recommendation.recommendedSeniority, 4)
    recommendation.reasoning.push('Alta complejidad requiere experiencia senior')
  } else if (task.complexityLevel <= 2) {
    recommendation.recommendedSeniority = Math.min(recommendation.recommendedSeniority, 2)
    recommendation.reasoning.push('Tarea simple: apropiada para cualquier nivel')
  }

  // Generate default plan if none created
  if (recommendation.suggestedPlan.length === 0) {
    if (task.estimatedDuration === 'XS' || task.estimatedDuration === 'S') {
      recommendation.suggestedPlan.push('Ejecutar directamente')
      recommendation.suggestedPlan.push('Marcar como completada')
    } else {
      recommendation.suggestedPlan.push('Revisar requerimientos')
      recommendation.suggestedPlan.push('Definir pasos específicos')
      recommendation.suggestedPlan.push('Ejecutar y documentar progreso')
    }
  }

  return recommendation
}

/**
 * Determine if a task should be flagged for immediate attention
 */
export function shouldFlagImmediate(task: Task): { flag: boolean; reason: string | null } {
  const { daysRemaining, isClientDeadline } = calculateDeadlinePressure(
    task.internalDeadline,
    task.externalClientDeadline
  )

  // Rule 1: Client deadline in 1-2 days
  if (isClientDeadline && daysRemaining !== null && daysRemaining <= 2) {
    return { flag: true, reason: 'Deadline de cliente en menos de 48 horas' }
  }

  // Rule 2: Very urgent (5) and important (>=4)
  if (task.urgencyLevel === 5 && task.importanceLevel >= 4) {
    return { flag: true, reason: 'Máxima urgencia con alta importancia' }
  }

  // Rule 3: Overdue
  if (daysRemaining !== null && daysRemaining <= 0) {
    return { flag: true, reason: 'Tarea vencida' }
  }

  // Rule 4: Blocked and urgent
  if (task.status === 'BLOCKED' && task.urgencyLevel >= 4) {
    return { flag: true, reason: 'Bloqueada con alta urgencia' }
  }

  return { flag: false, reason: null }
}

/**
 * Get tasks grouped by quadrant for grid view
 */
export function groupTasksByQuadrant(tasks: Task[]): Record<Quadrant, Task[]> {
  const grouped: Record<Quadrant, Task[]> = {
    'DO_NOW': [],
    'SCHEDULE': [],
    'DELEGATE': [],
    'ELIMINATE': []
  }

  for (const task of tasks) {
    if (task.status === 'DONE') continue // Skip completed
    const quadrant = getTaskQuadrant(task)
    grouped[quadrant].push(task)
  }

  // Sort each quadrant by priority score
  for (const quadrant of Object.keys(grouped) as Quadrant[]) {
    grouped[quadrant].sort((a, b) => calculatePriorityScore(b) - calculatePriorityScore(a))
  }

  return grouped
}

/**
 * Suggest owner based on member skills, capacity, and task requirements
 */
export interface Member {
  id: string
  name: string
  role: string
  skillTags: string | null
  seniorityLevel: number
  maxConcurrentTasks: number
  isActive: boolean
  _count?: { tasks: number }
}

export function suggestOwner(
  task: { skillTags: string | null; complexityLevel: number },
  members: Member[],
  recommendation: AssignmentRecommendation
): { memberId: string; memberName: string; confidence: number; reason: string } | null {
  if (members.length === 0) return null

  const taskSkills = task.skillTags?.split(',').map(s => s.trim().toLowerCase()) || []
  const candidates: { member: Member; score: number; reasons: string[] }[] = []

  for (const member of members) {
    if (!member.isActive) continue

    let score = 0
    const reasons: string[] = []

    // Check capacity
    const currentTasks = member._count?.tasks || 0
    if (currentTasks >= member.maxConcurrentTasks) {
      continue // Skip overloaded members
    }
    const capacityScore = ((member.maxConcurrentTasks - currentTasks) / member.maxConcurrentTasks) * 20
    score += capacityScore
    reasons.push(`Capacidad: ${member.maxConcurrentTasks - currentTasks} slots disponibles`)

    // Check seniority match
    if (member.seniorityLevel >= recommendation.recommendedSeniority) {
      score += 30
      reasons.push('Nivel de experiencia apropiado')
    } else if (member.seniorityLevel === recommendation.recommendedSeniority - 1) {
      score += 15
      reasons.push('Nivel de experiencia cercano')
    }

    // Check skill match
    const memberSkills = member.skillTags?.split(',').map(s => s.trim().toLowerCase()) || []
    const matchingSkills = taskSkills.filter(s => memberSkills.includes(s))
    if (matchingSkills.length > 0) {
      const skillScore = (matchingSkills.length / Math.max(taskSkills.length, 1)) * 40
      score += skillScore
      reasons.push(`Skills: ${matchingSkills.join(', ')}`)
    }

    candidates.push({ member, score, reasons })
  }

  if (candidates.length === 0) return null

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  return {
    memberId: best.member.id,
    memberName: best.member.name,
    confidence: Math.min(best.score / 100, 1),
    reason: best.reasons.join('; ')
  }
}

/**
 * Calculate efficiency ratio: estimated vs actual hours
 */
export function calculateEfficiency(
  estimatedDuration: string,
  actualMinutes: number
): { ratio: number; status: 'UNDER' | 'ON_TRACK' | 'OVER'; label: string } {
  const estimatedHours = DURATION_HOURS[estimatedDuration] || 6
  const actualHours = actualMinutes / 60

  if (actualHours === 0) {
    return { ratio: 0, status: 'UNDER', label: 'Sin tiempo registrado' }
  }

  const ratio = estimatedHours / actualHours

  if (ratio >= 1.2) {
    return { ratio, status: 'UNDER', label: 'Más rápido de lo esperado' }
  } else if (ratio >= 0.8) {
    return { ratio, status: 'ON_TRACK', label: 'En tiempo estimado' }
  } else {
    return { ratio, status: 'OVER', label: 'Más lento de lo esperado' }
  }
}
