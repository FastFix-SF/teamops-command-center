export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function getDaysRemaining(dueDate: Date | string | null): number | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    P0: 'bg-red-500 text-white',
    P1: 'bg-orange-500 text-white',
    P2: 'bg-blue-500 text-white',
    P3: 'bg-gray-400 text-white'
  }
  return colors[priority] || colors.P2
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    NOT_STARTED: 'bg-gray-200 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    BLOCKED: 'bg-purple-100 text-purple-700',
    DONE: 'bg-green-100 text-green-700'
  }
  return colors[status] || colors.NOT_STARTED
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NOT_STARTED: 'Sin Iniciar',
    IN_PROGRESS: 'En Progreso',
    BLOCKED: 'Bloqueada',
    DONE: 'Completada'
  }
  return labels[status] || status
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function calculatePerformanceScore(
  deliveryScore: number,
  progressScore: number,
  improvementScore: number
): number {
  return Math.min(100, deliveryScore + progressScore + improvementScore)
}

export function calculateBonus(billableHours: number, performanceScore: number, bonusRate: number): number {
  const multiplier = 1 + (performanceScore / 100)
  return billableHours * bonusRate * multiplier
}
