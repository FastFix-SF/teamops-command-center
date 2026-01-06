import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * J.A.R.V.I.S. - Just A Rather Very Intelligent System
 * Ultimate AI Command Center for TeamOps
 *
 * This is the most powerful AI assistant capable of:
 * - Full CRUD on ALL entities (tasks, members, meetings, time, reports, etc.)
 * - Virtual Office control (positions, zones, messages, activities)
 * - AI Check-ins management
 * - Notifications and alerts
 * - Settings management
 * - Complex analytics and reporting
 * - Bulk operations
 * - Natural language understanding
 * - Multi-step command chains
 */

export interface AgentAction {
  id: string
  type: 'thinking' | 'reading' | 'creating' | 'updating' | 'deleting' | 'searching' | 'analyzing' | 'executing' | 'success' | 'error' | 'warning' | 'info'
  entity?: string
  description: string
  data?: unknown
  timestamp: number
}

export interface AgentResponse {
  success: boolean
  message: string
  actions: AgentAction[]
  result?: unknown
  suggestions?: string[]
}

// Generate unique action ID
const actionId = () => `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Helper for case-insensitive search (SQLite doesn't support mode: 'insensitive')
async function findMemberByName(name: string) {
  const members = await prisma.member.findMany({ where: { isActive: true } })
  return members.find(m => m.name.toLowerCase().includes(name.toLowerCase()))
}

async function findTaskByTitle(title: string, extraWhere?: Record<string, unknown>) {
  const tasks = await prisma.task.findMany({ where: extraWhere })
  return tasks.find(t => t.title.toLowerCase().includes(title.toLowerCase()))
}

// ============================================================
// COMMAND PARSER - Natural Language Understanding
// ============================================================

interface ParsedCommand {
  intent: string
  entity: string
  action: string
  params: Record<string, unknown>
  confidence: number
}

function parseCommand(command: string): ParsedCommand {
  const lower = command.toLowerCase()
  const original = command

  // ==================== TASK OPERATIONS ====================

  // CREATE TASK
  if (matches(lower, ['crear', 'crea', 'nueva', 'añadir', 'add', 'new'], ['tarea', 'task'])) {
    // Extract title - try quoted first, then pattern after "tarea"
    let title = extractQuoted(original)
    if (!title) {
      // Try to get everything between "tarea" and "para/con/prioridad"
      const titleMatch = original.match(/tarea\s+(.+?)(?:\s+para\s|\s+con\s|\s+prioridad|\s+p[0-3]|$)/i)
      title = titleMatch?.[1]?.trim()
    }
    const priority = extractPriority(lower)
    const owner = extractName(original, ['para', 'for', 'asignar a', 'assign to'])
    const dueDate = extractDate(lower)

    return {
      intent: 'create', entity: 'task', action: 'create_task',
      params: { title: title || 'Nueva tarea', priority, ownerName: owner, dueDate },
      confidence: 0.9
    }
  }

  // COMPLETE/FINISH TASK
  if (matches(lower, ['completar', 'terminar', 'finish', 'complete', 'done', 'marcar como hecho', 'cerrar'], ['tarea', 'task', ''])) {
    const title = extractQuoted(original) || extractAfter(original, ['tarea', 'task'])
    return {
      intent: 'update', entity: 'task', action: 'complete_task',
      params: { title },
      confidence: 0.85
    }
  }

  // UPDATE TASK PROGRESS
  if (matches(lower, ['actualizar', 'cambiar', 'update', 'modificar', 'progreso'], ['tarea', 'task', 'progreso', 'progress', '%'])) {
    const title = extractQuoted(original)
    const progress = extractNumber(lower, ['%', 'percent', 'progreso'])
    const status = extractStatus(lower)
    return {
      intent: 'update', entity: 'task', action: 'update_task',
      params: { title, progressPercent: progress, status },
      confidence: 0.8
    }
  }

  // BLOCK/UNBLOCK TASK
  if (matches(lower, ['bloquear', 'block', 'desbloquear', 'unblock'])) {
    const title = extractQuoted(original) || extractAfter(original, ['tarea', 'task'])
    const isBlocking = lower.includes('bloquear') || lower.includes('block')
    const reason = extractAfter(original, ['porque', 'reason', 'por', 'due to'])
    return {
      intent: 'update', entity: 'task', action: 'block_task',
      params: { title, block: isBlocking, reason },
      confidence: 0.85
    }
  }

  // DELETE TASK
  if (matches(lower, ['eliminar', 'borrar', 'delete', 'remove', 'quitar'], ['tarea', 'task'])) {
    const title = extractQuoted(original) || extractAfter(original, ['tarea', 'task'])
    return {
      intent: 'delete', entity: 'task', action: 'delete_task',
      params: { title },
      confidence: 0.9
    }
  }

  // ASSIGN/REASSIGN TASK
  if (matches(lower, ['asignar', 'reasignar', 'assign', 'reassign', 'dar', 'give'], ['tarea', 'task', 'a'])) {
    const title = extractQuoted(original)
    const owner = extractName(original, ['a', 'to', 'para'])
    return {
      intent: 'update', entity: 'task', action: 'assign_task',
      params: { title, ownerName: owner },
      confidence: 0.85
    }
  }

  // LIST/SHOW TASKS
  if (matches(lower, ['mostrar', 'muestra', 'ver', 'listar', 'list', 'show', 'dame', 'cuáles', 'qué', 'todas', 'todos'], ['tarea', 'tasks', 'pendiente', 'bloqueada', 'vencida'])) {
    const status = extractTaskStatus(lower)
    const owner = extractName(original, ['de', 'of', 'para', 'for'])
    return {
      intent: 'query', entity: 'task', action: 'list_tasks',
      params: { status, ownerName: owner },
      confidence: 0.9
    }
  }

  // ==================== MEMBER OPERATIONS ====================

  // CREATE/ADD MEMBER
  if (matches(lower, ['agregar', 'añadir', 'crear', 'nuevo', 'add', 'new', 'contratar', 'hire'], ['miembro', 'empleado', 'persona', 'member', 'employee'])) {
    const name = extractQuoted(original) || extractName(original, ['miembro', 'empleado', 'llamado', 'named'])
    const role = extractAfter(original, ['como', 'as', 'rol'])
    const email = extractEmail(original)
    return {
      intent: 'create', entity: 'member', action: 'create_member',
      params: { name: name || 'Nuevo Miembro', role: role || 'Analyst', email },
      confidence: 0.85
    }
  }

  // DELETE/REMOVE MEMBER
  if (matches(lower, ['eliminar', 'borrar', 'quitar', 'despedir', 'remove', 'delete', 'fire'], ['miembro', 'empleado', 'member'])) {
    const name = extractQuoted(original) || extractName(original, ['a', 'miembro', 'empleado', 'to'])
    return {
      intent: 'delete', entity: 'member', action: 'delete_member',
      params: { name },
      confidence: 0.85
    }
  }

  // UPDATE MEMBER
  if (matches(lower, ['actualizar', 'cambiar', 'modificar', 'update', 'change'], ['miembro', 'empleado', 'member', 'rol', 'role'])) {
    const name = extractQuoted(original) || extractName(original, ['de', 'of', 'miembro'])
    const role = extractAfter(original, ['a', 'to', 'rol', 'role'])
    const skills = extractAfter(original, ['skills', 'habilidades'])
    return {
      intent: 'update', entity: 'member', action: 'update_member',
      params: { name, role, skills },
      confidence: 0.8
    }
  }

  // LIST MEMBERS / TEAM
  if (matches(lower, ['mostrar', 'ver', 'listar', 'equipo', 'team', 'quién', 'quien', 'miembros', 'empleados'], ['equipo', 'team', 'miembro', 'empleado', 'online', 'disponible'])) {
    const statusFilter = lower.includes('online') || lower.includes('disponible') ? 'online' :
                        lower.includes('ocupado') || lower.includes('busy') ? 'busy' : undefined
    return {
      intent: 'query', entity: 'member', action: 'list_members',
      params: { status: statusFilter },
      confidence: 0.9
    }
  }

  // ==================== VIRTUAL OFFICE OPERATIONS ====================

  // CHANGE OFFICE STATUS
  if (matches(lower, ['cambiar', 'poner', 'set', 'change', 'actualizar'], ['estado', 'status', 'online', 'offline', 'ocupado', 'busy', 'away', 'reunión'])) {
    const status = extractOfficeStatus(lower)
    const name = extractName(original, ['de', 'of', 'para', 'for', 'mi'])
    const message = extractQuoted(original) || extractAfter(original, ['mensaje', 'message'])
    return {
      intent: 'update', entity: 'office', action: 'update_status',
      params: { status, memberName: name, statusMessage: message },
      confidence: 0.85
    }
  }

  // MOVE IN OFFICE / GO TO ZONE
  if (matches(lower, ['mover', 'ir', 'move', 'go', 'cambiar zona', 'entrar'], ['a', 'to', 'zona', 'zone', 'sala', 'room', 'oficina'])) {
    const zone = extractAfter(original, ['a', 'to', 'zona', 'zone', 'sala']) || extractQuoted(original)
    const name = extractName(original, ['de', 'mover a'])
    return {
      intent: 'update', entity: 'office', action: 'move_to_zone',
      params: { zone, memberName: name },
      confidence: 0.8
    }
  }

  // SEND OFFICE MESSAGE
  if (matches(lower, ['enviar', 'mandar', 'send', 'mensaje', 'message', 'decir', 'tell', 'saludar', 'wave'])) {
    // Extract recipient - look for pattern "a [Name] diciendo" or "a [Name]:"
    let to: string | undefined
    const msgMatch = original.match(/\ba\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+)(?:\s+(?:diciendo|saying|que|:)|$)/i)
    if (msgMatch) {
      to = msgMatch[1]
    }
    const message = extractQuoted(original) || extractAfter(original, ['diciendo', 'saying'])
    const type = lower.includes('salud') || lower.includes('wave') ? 'WAVE' :
                 lower.includes('café') || lower.includes('coffee') ? 'COFFEE_INVITE' : 'NOTE'
    return {
      intent: 'create', entity: 'office_message', action: 'send_message',
      params: { toName: to, message, type },
      confidence: 0.85
    }
  }

  // CUSTOMIZE DESK/WORKSPOT
  if (matches(lower, ['personalizar', 'decorar', 'customize', 'decorate', 'cambiar'], ['escritorio', 'desk', 'workspot', 'espacio'])) {
    const style = extractAfter(original, ['estilo', 'style'])
    const color = extractColor(lower)
    return {
      intent: 'update', entity: 'workspot', action: 'customize_desk',
      params: { style, color },
      confidence: 0.75
    }
  }

  // ==================== TIME TRACKING ====================

  // LOG TIME
  if (matches(lower, ['registrar', 'agregar', 'log', 'add', 'track'], ['tiempo', 'horas', 'time', 'hours', 'minutos'])) {
    const hours = extractNumber(lower, ['hora', 'hour', 'h'])
    const minutes = extractNumber(lower, ['minuto', 'minute', 'min', 'm'])
    const member = extractName(original, ['para', 'for', 'de', 'of'])
    const task = extractQuoted(original) || extractAfter(original, ['en', 'on', 'tarea', 'task'])
    const category = extractTimeCategory(lower)

    let totalMinutes = 0
    if (hours) totalMinutes += hours * 60
    if (minutes) totalMinutes += minutes
    if (!totalMinutes) totalMinutes = 60

    return {
      intent: 'create', entity: 'time_entry', action: 'create_time_entry',
      params: { durationMinutes: totalMinutes, memberName: member, taskTitle: task, category },
      confidence: 0.85
    }
  }

  // LIST TIME ENTRIES
  if (matches(lower, ['mostrar', 'ver', 'listar', 'cuántas', 'report'], ['tiempo', 'horas', 'time', 'hours', 'registros'])) {
    const member = extractName(original, ['de', 'of', 'para'])
    const period = extractTimePeriod(lower)
    return {
      intent: 'query', entity: 'time_entry', action: 'list_time_entries',
      params: { memberName: member, period },
      confidence: 0.85
    }
  }

  // ==================== MEETINGS ====================

  // CREATE MEETING
  if (matches(lower, ['crear', 'programar', 'agendar', 'schedule', 'create', 'new'], ['reunión', 'meeting', 'standup', 'sync'])) {
    const title = extractQuoted(original) || extractAfter(original, ['reunión', 'meeting', 'llamada'])
    const type = extractMeetingType(lower)
    const time = extractTime(lower)
    const participants = extractNames(original, ['con', 'with', 'invitar', 'invite'])
    return {
      intent: 'create', entity: 'meeting', action: 'create_meeting',
      params: { title, type, scheduledTime: time, participants },
      confidence: 0.85
    }
  }

  // START/END MEETING - must include 'reunion' or 'meeting' context
  if (matches(lower, ['iniciar', 'empezar', 'start', 'begin', 'terminar', 'end', 'finalizar'], ['reunión', 'meeting', 'standup'])) {
    const isStarting = matches(lower, ['iniciar', 'empezar', 'start', 'begin'])
    return {
      intent: 'update', entity: 'meeting', action: isStarting ? 'start_meeting' : 'end_meeting',
      params: {},
      confidence: 0.8
    }
  }

  // LIST MEETINGS
  if (matches(lower, ['mostrar', 'ver', 'cuáles', 'list', 'próximas'], ['reunión', 'meeting', 'reuniones', 'meetings'])) {
    return {
      intent: 'query', entity: 'meeting', action: 'list_meetings',
      params: {},
      confidence: 0.85
    }
  }

  // ==================== NOTIFICATIONS & ALERTS ====================

  // SEND NOTIFICATION
  if (matches(lower, ['notificar', 'alertar', 'avisar', 'notify', 'alert', 'remind'], ['a', 'to', 'equipo', 'team'])) {
    const to = extractName(original, ['a', 'to']) || 'all'
    const message = extractQuoted(original) || extractAfter(original, ['diciendo', 'saying', 'que', 'that'])
    const channel = lower.includes('sms') ? 'SMS' : lower.includes('email') ? 'EMAIL' : 'IN_APP'
    return {
      intent: 'create', entity: 'notification', action: 'send_notification',
      params: { toName: to, message, channel },
      confidence: 0.8
    }
  }

  // ==================== AI CHECK-INS ====================

  // REQUEST CHECK-IN
  if (matches(lower, ['pedir', 'solicitar', 'request', 'iniciar'], ['checkin', 'check-in', 'actualización', 'update', 'reporte'])) {
    const member = extractName(original, ['a', 'de', 'from', 'to'])
    const task = extractQuoted(original) || extractAfter(original, ['sobre', 'about', 'tarea'])
    return {
      intent: 'create', entity: 'checkin', action: 'request_checkin',
      params: { memberName: member, taskTitle: task },
      confidence: 0.75
    }
  }

  // ==================== REPORTS & ANALYTICS ====================

  // GENERATE REPORT
  if (matches(lower, ['generar', 'crear', 'generate', 'create', 'dame'], ['reporte', 'report', 'análisis', 'analysis', 'resumen'])) {
    const type = lower.includes('mensual') || lower.includes('monthly') ? 'monthly' :
                 lower.includes('semanal') || lower.includes('weekly') ? 'weekly' : 'daily'
    const member = extractName(original, ['de', 'of', 'para', 'for'])
    return {
      intent: 'query', entity: 'report', action: 'generate_report',
      params: { type, memberName: member },
      confidence: 0.8
    }
  }

  // PERFORMANCE ANALYSIS
  if (matches(lower, ['analizar', 'analyze', 'rendimiento', 'performance', 'productividad', 'productivity'])) {
    const member = extractName(original, ['de', 'of'])
    const period = extractTimePeriod(lower)
    return {
      intent: 'analyze', entity: 'performance', action: 'analyze_performance',
      params: { memberName: member, period },
      confidence: 0.85
    }
  }

  // ==================== SYSTEM OVERVIEW & DASHBOARD ====================

  // SYSTEM OVERVIEW / DASHBOARD
  if (matches(lower, ['resumen', 'overview', 'dashboard', 'panorama', 'estado del sistema', 'system status', 'cómo está', 'how is'])) {
    return {
      intent: 'query', entity: 'system', action: 'get_overview',
      params: {},
      confidence: 0.95
    }
  }

  // HEALTH CHECK
  if (matches(lower, ['health', 'salud', 'diagnóstico', 'diagnostic', 'problemas', 'issues'])) {
    return {
      intent: 'analyze', entity: 'system', action: 'health_check',
      params: {},
      confidence: 0.85
    }
  }

  // ==================== SETTINGS ====================

  // UPDATE SETTINGS
  if (matches(lower, ['configurar', 'configure', 'setting', 'ajustar', 'cambiar configuración'])) {
    const setting = extractAfter(original, ['configurar', 'configure', 'setting'])
    const value = extractQuoted(original) || extractAfter(original, ['a', 'to', 'valor'])
    return {
      intent: 'update', entity: 'setting', action: 'update_setting',
      params: { setting, value },
      confidence: 0.7
    }
  }

  // ==================== BULK OPERATIONS ====================

  // BULK COMPLETE
  if (matches(lower, ['completar todas', 'complete all', 'terminar todas', 'finish all', 'cerrar todas'])) {
    const status = extractTaskStatus(lower)
    const owner = extractName(original, ['de', 'of'])
    return {
      intent: 'bulk', entity: 'task', action: 'bulk_complete',
      params: { status, ownerName: owner },
      confidence: 0.8
    }
  }

  // BULK ASSIGN
  if (matches(lower, ['asignar todas', 'assign all', 'reasignar todas', 'reassign all'])) {
    const owner = extractName(original, ['a', 'to'])
    return {
      intent: 'bulk', entity: 'task', action: 'bulk_assign',
      params: { ownerName: owner },
      confidence: 0.75
    }
  }

  // ==================== FOCUS MODE ====================

  // SET FOCUS
  if (matches(lower, ['enfocar', 'focus', 'priorizar', 'prioritize', 'enfocarse'])) {
    const task = extractQuoted(original) || extractAfter(original, ['en', 'on', 'tarea'])
    return {
      intent: 'update', entity: 'focus', action: 'set_focus',
      params: { taskTitle: task },
      confidence: 0.8
    }
  }

  // ==================== HELP & CAPABILITIES ====================

  // HELP
  if (matches(lower, ['ayuda', 'help', 'qué puedes', 'what can you', 'comandos', 'commands', 'capacidades', 'capabilities'])) {
    return {
      intent: 'info', entity: 'system', action: 'show_help',
      params: {},
      confidence: 0.95
    }
  }

  // Default: conversational fallback
  return {
    intent: 'chat', entity: 'system', action: 'general_response',
    params: { query: command },
    confidence: 0.5
  }
}

// ============================================================
// HELPER FUNCTIONS FOR PARSING
// ============================================================

function matches(text: string, keywords: string[], context?: string[]): boolean {
  if (!text || !keywords) return false
  const hasKeyword = keywords.some(k => k === '' || text.includes(k))
  const hasContext = !context || context.length === 0 || context.some(c => c === '' || text.includes(c))
  return hasKeyword && hasContext
}

function extractQuoted(text: string): string | undefined {
  const match = text.match(/["']([^"']+)["']/) || text.match(/«([^»]+)»/)
  return match?.[1]?.trim()
}

function extractAfter(text: string, keywords: string[]): string | undefined {
  for (const kw of keywords) {
    const regex = new RegExp(`${kw}\\s+([\\w\\s]+?)(?:\\s+(?:para|con|a|to|for|with)|$)`, 'i')
    const match = text.match(regex)
    if (match) return match[1].trim()
  }
  return undefined
}

function extractName(text: string, keywords: string[]): string | undefined {
  for (const kw of keywords) {
    // Try word after keyword (any case)
    const regex = new RegExp(`${kw}\\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+(?:\\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)?)(?:\\s|$|,|\\.)`, 'i')
    const match = text.match(regex)
    if (match && match[1]) {
      const name = match[1].trim()
      // Filter out common words that aren't names
      if (!['diciendo', 'saying', 'que', 'para', 'con', 'en'].includes(name.toLowerCase())) {
        return name
      }
    }
  }
  return undefined
}

function extractNames(text: string, keywords: string[]): string[] {
  const names: string[] = []
  for (const kw of keywords) {
    const regex = new RegExp(`${kw}\\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?(?:,\\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)*)`, 'i')
    const match = text.match(regex)
    if (match) {
      names.push(...match[1].split(',').map(n => n.trim()))
    }
  }
  return names
}

function extractNumber(text: string, keywords: string[]): number | undefined {
  for (const kw of keywords) {
    const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${kw}`, 'i')
    const match = text.match(regex)
    if (match) return parseFloat(match[1])
  }
  const generalMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|horas?|hours?|min)/i)
  return generalMatch ? parseFloat(generalMatch[1]) : undefined
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w+/)
  return match?.[0]
}

function extractPriority(text: string): string {
  if (text.includes('p0') || text.includes('crítica') || text.includes('critical') || text.includes('urgente')) return 'P0'
  if (text.includes('p1') || text.includes('alta') || text.includes('high')) return 'P1'
  if (text.includes('p3') || text.includes('baja') || text.includes('low')) return 'P3'
  return 'P2'
}

function extractDate(text: string): Date | undefined {
  if (text.includes('hoy') || text.includes('today')) return new Date()
  if (text.includes('mañana') || text.includes('tomorrow')) {
    const d = new Date(); d.setDate(d.getDate() + 1); return d
  }
  if (text.includes('próxima semana') || text.includes('next week')) {
    const d = new Date(); d.setDate(d.getDate() + 7); return d
  }
  const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (dateMatch) {
    const [, day, month, year] = dateMatch
    return new Date(parseInt(year || '2025'), parseInt(month) - 1, parseInt(day))
  }
  return undefined
}

function extractTime(text: string): string | undefined {
  const match = text.match(/(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i)
  return match?.[0]
}

function extractTaskStatus(text: string): string | undefined {
  if (text.includes('vencida') || text.includes('overdue') || text.includes('atrasada')) return 'overdue'
  if (text.includes('bloqueada') || text.includes('blocked')) return 'BLOCKED'
  if (text.includes('completada') || text.includes('done') || text.includes('terminada')) return 'DONE'
  if (text.includes('progreso') || text.includes('in progress') || text.includes('working')) return 'IN_PROGRESS'
  if (text.includes('pendiente') || text.includes('not started') || text.includes('nueva')) return 'NOT_STARTED'
  return undefined
}

function extractStatus(text: string): string | undefined {
  if (text.includes('bloqueado') || text.includes('blocked')) return 'BLOCKED'
  if (text.includes('progreso') || text.includes('in progress')) return 'IN_PROGRESS'
  if (text.includes('completado') || text.includes('done')) return 'DONE'
  if (text.includes('no iniciado') || text.includes('not started')) return 'NOT_STARTED'
  return undefined
}

function extractOfficeStatus(text: string): string {
  if (text.includes('online') || text.includes('disponible') || text.includes('available')) return 'ONLINE'
  if (text.includes('ocupado') || text.includes('busy')) return 'BUSY'
  if (text.includes('ausente') || text.includes('away')) return 'AWAY'
  if (text.includes('reunión') || text.includes('meeting')) return 'IN_MEETING'
  if (text.includes('offline') || text.includes('desconectado')) return 'OFFLINE'
  return 'ONLINE'
}

function extractTimeCategory(text: string): string {
  if (text.includes('cliente') || text.includes('client')) return 'CLIENT_WORK'
  if (text.includes('interno') || text.includes('internal')) return 'INTERNAL'
  if (text.includes('ventas') || text.includes('sales')) return 'SALES'
  if (text.includes('investigación') || text.includes('r&d') || text.includes('research')) return 'R_AND_D'
  if (text.includes('admin') || text.includes('administrativo')) return 'ADMIN'
  return 'INTERNAL'
}

function extractTimePeriod(text: string): string {
  if (text.includes('hoy') || text.includes('today')) return 'today'
  if (text.includes('semana') || text.includes('week')) return 'week'
  if (text.includes('mes') || text.includes('month')) return 'month'
  if (text.includes('año') || text.includes('year')) return 'year'
  return 'week'
}

function extractMeetingType(text: string): string {
  if (text.includes('standup') || text.includes('diaria') || text.includes('daily')) return 'DAILY_STANDUP'
  if (text.includes('semanal') || text.includes('weekly') || text.includes('planning')) return 'WEEKLY_PLANNING'
  if (text.includes('mensual') || text.includes('monthly') || text.includes('review')) return 'MONTHLY_REVIEW'
  if (text.includes('1:1') || text.includes('one on one')) return 'ONE_ON_ONE'
  return 'DAILY_STANDUP'
}

function extractColor(text: string): string | undefined {
  const colorMap: Record<string, string> = {
    'rojo': '#EF4444', 'red': '#EF4444',
    'azul': '#3B82F6', 'blue': '#3B82F6',
    'verde': '#22C55E', 'green': '#22C55E',
    'amarillo': '#EAB308', 'yellow': '#EAB308',
    'morado': '#8B5CF6', 'purple': '#8B5CF6',
    'rosa': '#EC4899', 'pink': '#EC4899',
    'naranja': '#F97316', 'orange': '#F97316'
  }
  for (const [name, hex] of Object.entries(colorMap)) {
    if (text.includes(name)) return hex
  }
  const hexMatch = text.match(/#[0-9A-Fa-f]{6}/)
  return hexMatch?.[0]
}

// ============================================================
// COMMAND EXECUTOR
// ============================================================

async function executeCommand(
  parsed: ParsedCommand,
  actions: AgentAction[]
): Promise<{ success: boolean; message: string; data?: unknown; suggestions?: string[] }> {

  const { action, params } = parsed

  switch (action) {
    // ==================== TASKS ====================
    case 'create_task': {
      actions.push({ id: actionId(), type: 'searching', entity: 'member', description: `Buscando miembro para asignar...`, timestamp: Date.now() })

      let ownerId: string | undefined
      if (params.ownerName) {
        const member = await findMemberByName(params.ownerName as string)
        ownerId = member?.id
      }
      if (!ownerId) {
        const first = await prisma.member.findFirst({ where: { isActive: true } })
        ownerId = first?.id
      }
      if (!ownerId) return { success: false, message: 'No hay miembros disponibles para asignar la tarea' }

      actions.push({ id: actionId(), type: 'creating', entity: 'task', description: `Creando tarea "${params.title}"...`, timestamp: Date.now() })

      const task = await prisma.task.create({
        data: {
          title: (params.title as string) || 'Nueva tarea',
          ownerId,
          priority: params.priority as string || 'P2',
          dueDate: params.dueDate ? new Date(params.dueDate as string) : null,
          urgencyLevel: params.priority === 'P0' ? 5 : params.priority === 'P1' ? 4 : 3,
          importanceLevel: params.priority === 'P0' ? 5 : params.priority === 'P1' ? 4 : 3
        },
        include: { owner: { select: { name: true } } }
      })

      actions.push({ id: actionId(), type: 'success', entity: 'task', description: `Tarea creada exitosamente`, data: { id: task.id, title: task.title }, timestamp: Date.now() })

      return {
        success: true,
        message: `✅ Tarea "${task.title}" creada y asignada a ${task.owner.name}`,
        data: task,
        suggestions: ['Ver todas las tareas', 'Crear otra tarea', `Actualizar progreso de "${task.title}"`]
      }
    }

    case 'complete_task': {
      actions.push({ id: actionId(), type: 'searching', entity: 'task', description: `Buscando tarea...`, timestamp: Date.now() })

      let task
      if (params.title) {
        task = await findTaskByTitle(params.title as string, { status: { not: 'DONE' } })
        if (task) task = await prisma.task.findUnique({ where: { id: task.id }, include: { owner: { select: { name: true } } } })
      } else {
        task = await prisma.task.findFirst({ where: { status: { not: 'DONE' } }, include: { owner: { select: { name: true } } } })
      }
      if (!task) return { success: false, message: 'No encontré la tarea especificada' }

      actions.push({ id: actionId(), type: 'updating', entity: 'task', description: `Marcando "${task.title}" como completada...`, timestamp: Date.now() })

      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'DONE', progressPercent: 100, completedAt: new Date() }
      })

      actions.push({ id: actionId(), type: 'success', entity: 'task', description: `Tarea completada`, timestamp: Date.now() })

      return {
        success: true,
        message: `✅ Tarea "${task.title}" marcada como completada`,
        data: task,
        suggestions: ['Ver tareas pendientes', 'Análisis de rendimiento']
      }
    }

    case 'update_task': {
      actions.push({ id: actionId(), type: 'searching', entity: 'task', description: `Buscando tarea...`, timestamp: Date.now() })

      let task = params.title ? await findTaskByTitle(params.title as string) :
                 await prisma.task.findFirst({ where: { status: { not: 'DONE' } } })
      if (!task) return { success: false, message: 'No encontré la tarea' }

      const updateData: Record<string, unknown> = { lastCheckinAt: new Date() }
      if (params.progressPercent !== undefined) updateData.progressPercent = params.progressPercent
      if (params.status) {
        const statusMap: Record<string, string> = { 'bloqueado': 'BLOCKED', 'en progreso': 'IN_PROGRESS', 'completado': 'DONE' }
        updateData.status = statusMap[params.status as string] || params.status
      }

      actions.push({ id: actionId(), type: 'updating', entity: 'task', description: `Actualizando "${task.title}"...`, timestamp: Date.now() })

      const updated = await prisma.task.update({ where: { id: task.id }, data: updateData })

      return { success: true, message: `✅ Tarea "${task.title}" actualizada`, data: updated }
    }

    case 'block_task': {
      actions.push({ id: actionId(), type: 'searching', entity: 'task', description: `Buscando tarea...`, timestamp: Date.now() })

      const task = params.title ? await findTaskByTitle(params.title as string) : null
      if (!task) return { success: false, message: 'No encontré la tarea' }

      const newStatus = params.block ? 'BLOCKED' : 'IN_PROGRESS'

      actions.push({ id: actionId(), type: 'updating', entity: 'task', description: params.block ? `Bloqueando tarea...` : `Desbloqueando tarea...`, timestamp: Date.now() })

      await prisma.task.update({
        where: { id: task.id },
        data: { status: newStatus, blockerNotes: params.block ? (params.reason as string || 'Bloqueada') : null }
      })

      return {
        success: true,
        message: params.block ? `🚫 Tarea "${task.title}" bloqueada` : `✅ Tarea "${task.title}" desbloqueada`,
        suggestions: params.block ? ['Ver tareas bloqueadas', 'Notificar al equipo'] : ['Ver tareas en progreso']
      }
    }

    case 'assign_task': {
      actions.push({ id: actionId(), type: 'searching', entity: 'task', description: `Buscando tarea y miembro...`, timestamp: Date.now() })

      const task = params.title ? await findTaskByTitle(params.title as string) : null
      if (!task) return { success: false, message: 'No encontré la tarea' }

      const member = params.ownerName ? await findMemberByName(params.ownerName as string) : null
      if (!member) return { success: false, message: 'No encontré al miembro' }

      actions.push({ id: actionId(), type: 'updating', entity: 'task', description: `Asignando a ${member.name}...`, timestamp: Date.now() })

      await prisma.task.update({ where: { id: task.id }, data: { ownerId: member.id } })

      return { success: true, message: `✅ Tarea "${task.title}" asignada a ${member.name}` }
    }

    case 'delete_task': {
      actions.push({ id: actionId(), type: 'searching', entity: 'task', description: `Buscando tarea...`, timestamp: Date.now() })

      const task = params.title ? await findTaskByTitle(params.title as string) : null
      if (!task) return { success: false, message: 'No encontré la tarea' }

      actions.push({ id: actionId(), type: 'deleting', entity: 'task', description: `Eliminando "${task.title}"...`, timestamp: Date.now() })

      await prisma.timeEntry.deleteMany({ where: { taskId: task.id } })
      await prisma.meetingResponse.deleteMany({ where: { topPriorityTaskId: task.id } })
      await prisma.aICheckin.deleteMany({ where: { taskId: task.id } })
      await prisma.task.delete({ where: { id: task.id } })

      return { success: true, message: `🗑️ Tarea "${task.title}" eliminada` }
    }

    case 'list_tasks': {
      actions.push({ id: actionId(), type: 'reading', entity: 'task', description: 'Consultando tareas...', timestamp: Date.now() })

      const where: Record<string, unknown> = {}
      if (params.status === 'overdue') {
        where.dueDate = { lt: new Date() }
        where.status = { not: 'DONE' }
      } else if (params.status) {
        where.status = params.status
      }

      if (params.ownerName) {
        const member = await findMemberByName(params.ownerName as string)
        if (member) where.ownerId = member.id
      }

      const tasks = await prisma.task.findMany({
        where,
        include: { owner: { select: { name: true } } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: 15
      })

      const taskList = tasks.map(t => `• ${t.priority} "${t.title}" (${t.owner.name}) - ${t.status} ${t.progressPercent}%`).join('\n')

      return {
        success: true,
        message: tasks.length > 0 ? `📋 **Tareas (${tasks.length}):**\n\n${taskList}` : '📋 No hay tareas que coincidan',
        data: tasks,
        suggestions: ['Crear nueva tarea', 'Ver tareas bloqueadas', 'Análisis de rendimiento']
      }
    }

    // ==================== MEMBERS ====================
    case 'create_member': {
      actions.push({ id: actionId(), type: 'creating', entity: 'member', description: `Agregando "${params.name}"...`, timestamp: Date.now() })

      const email = params.email || `${(params.name as string).toLowerCase().replace(/\s+/g, '.')}@company.com`
      const member = await prisma.member.create({
        data: {
          name: params.name as string,
          email: email as string,
          role: params.role as string || 'Analyst',
          timezone: 'EST',
          avatarColor: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          officeStatus: 'ONLINE'
        }
      })

      // Create workspot
      const memberCount = await prisma.member.count()
      await prisma.workspot.create({
        data: { memberId: member.id, gridX: (memberCount % 4) * 2, gridY: Math.floor(memberCount / 4) * 2 }
      })

      actions.push({ id: actionId(), type: 'success', entity: 'member', description: `Miembro creado`, timestamp: Date.now() })

      return { success: true, message: `✅ ${member.name} agregado como ${member.role}`, data: member }
    }

    case 'delete_member': {
      const member = params.name ? await findMemberByName(params.name as string) : null
      if (!member) return { success: false, message: 'No encontré al miembro' }

      actions.push({ id: actionId(), type: 'deleting', entity: 'member', description: `Desactivando ${member.name}...`, timestamp: Date.now() })

      await prisma.member.update({
        where: { id: member.id },
        data: { isActive: false, officeStatus: 'OFFLINE' }
      })

      return { success: true, message: `🗑️ ${member.name} desactivado del equipo` }
    }

    case 'update_member': {
      const member = params.name ? await findMemberByName(params.name as string) : null
      if (!member) return { success: false, message: 'No encontré al miembro' }

      actions.push({ id: actionId(), type: 'updating', entity: 'member', description: `Actualizando ${member.name}...`, timestamp: Date.now() })

      const updateData: Record<string, unknown> = {}
      if (params.role) updateData.role = params.role
      if (params.skills) updateData.skillTags = params.skills

      const updated = await prisma.member.update({ where: { id: member.id }, data: updateData })

      return { success: true, message: `✅ ${member.name} actualizado`, data: updated }
    }

    case 'list_members': {
      actions.push({ id: actionId(), type: 'reading', entity: 'member', description: 'Consultando equipo...', timestamp: Date.now() })

      const where: Record<string, unknown> = { isActive: true }
      if (params.status === 'online') where.officeStatus = { not: 'OFFLINE' }
      if (params.status === 'busy') where.officeStatus = 'BUSY'

      const members = await prisma.member.findMany({
        where,
        include: { _count: { select: { tasks: true } } }
      })

      const list = members.map(m => `• ${m.name} (${m.role}) - ${m.officeStatus} ${m.statusMessage ? `"${m.statusMessage}"` : ''} - ${m._count.tasks} tareas`).join('\n')

      return {
        success: true,
        message: `👥 **Equipo (${members.length}):**\n\n${list}`,
        data: members,
        suggestions: ['Agregar miembro', 'Ver tareas del equipo', 'Análisis de rendimiento']
      }
    }

    // ==================== VIRTUAL OFFICE ====================
    case 'update_status': {
      let member
      if (params.memberName) {
        member = await findMemberByName(params.memberName as string)
      } else {
        member = await prisma.member.findFirst({ where: { isActive: true } })
      }
      if (!member) return { success: false, message: 'No encontré al miembro' }

      actions.push({ id: actionId(), type: 'updating', entity: 'office', description: `Actualizando estado de ${member.name}...`, timestamp: Date.now() })

      await prisma.member.update({
        where: { id: member.id },
        data: {
          officeStatus: params.status as string,
          statusMessage: params.statusMessage as string || null,
          lastSeenAt: new Date()
        }
      })

      // Log activity
      await prisma.officeActivity.create({
        data: { memberId: member.id, type: 'STATUS_CHANGE', details: JSON.stringify({ newStatus: params.status }) }
      })

      return { success: true, message: `✅ Estado de ${member.name}: ${params.status}${params.statusMessage ? ` - "${params.statusMessage}"` : ''}` }
    }

    case 'move_to_zone': {
      let member = params.memberName ? await findMemberByName(params.memberName as string) :
                   await prisma.member.findFirst({ where: { isActive: true } })
      if (!member) return { success: false, message: 'No encontré al miembro' }

      actions.push({ id: actionId(), type: 'executing', entity: 'office', description: `Moviendo ${member.name} a ${params.zone}...`, timestamp: Date.now() })

      // Find zone
      const zone = await prisma.officeZone.findFirst({
        where: { name: { contains: params.zone as string } }
      })

      await prisma.member.update({
        where: { id: member.id },
        data: {
          currentZone: params.zone as string,
          positionX: zone?.gridX || 0,
          positionY: zone?.gridY || 0,
          officeStatus: zone?.type === 'MEETING_ROOM' ? 'IN_MEETING' : member.officeStatus
        }
      })

      await prisma.officeActivity.create({
        data: { memberId: member.id, type: 'ZONE_ENTER', zoneName: params.zone as string }
      })

      return { success: true, message: `✅ ${member.name} se movió a ${params.zone}` }
    }

    case 'send_message': {
      const to = params.toName ? await findMemberByName(params.toName as string) : null
      if (!to) return { success: false, message: 'No encontré al destinatario' }

      const from = await prisma.member.findFirst({ where: { isActive: true } })
      if (!from) return { success: false, message: 'No hay remitente disponible' }

      actions.push({ id: actionId(), type: 'creating', entity: 'message', description: `Enviando mensaje a ${to.name}...`, timestamp: Date.now() })

      await prisma.officeMessage.create({
        data: {
          fromId: from.id,
          toId: to.id,
          message: params.message as string || (params.type === 'WAVE' ? '👋' : params.type === 'COFFEE_INVITE' ? '☕ ¿Café?' : 'Hola'),
          type: params.type as string || 'NOTE',
          leftAtDesk: to.officeStatus === 'OFFLINE' || to.officeStatus === 'AWAY'
        }
      })

      return { success: true, message: `✅ Mensaje enviado a ${to.name}` }
    }

    case 'customize_desk': {
      const member = await prisma.member.findFirst({ where: { isActive: true } })
      if (!member) return { success: false, message: 'No hay miembro activo' }

      actions.push({ id: actionId(), type: 'updating', entity: 'workspot', description: `Personalizando escritorio...`, timestamp: Date.now() })

      await prisma.workspot.updateMany({
        where: { memberId: member.id },
        data: {
          deskStyle: params.style as string || 'modern',
          background: params.color as string || '#6366F1'
        }
      })

      return { success: true, message: `✅ Escritorio personalizado` }
    }

    // ==================== TIME TRACKING ====================
    case 'create_time_entry': {
      actions.push({ id: actionId(), type: 'searching', entity: 'member', description: 'Buscando miembro...', timestamp: Date.now() })

      let memberId: string | undefined
      if (params.memberName) {
        const member = await findMemberByName(params.memberName as string)
        memberId = member?.id
      }
      if (!memberId) {
        const first = await prisma.member.findFirst({ where: { isActive: true } })
        memberId = first?.id
      }
      if (!memberId) return { success: false, message: 'No hay miembros disponibles' }

      let taskId: string | undefined
      if (params.taskTitle) {
        const task = await findTaskByTitle(params.taskTitle as string)
        taskId = task?.id
      }

      actions.push({ id: actionId(), type: 'creating', entity: 'time_entry', description: 'Registrando tiempo...', timestamp: Date.now() })

      const entry = await prisma.timeEntry.create({
        data: {
          memberId,
          taskId,
          date: new Date(),
          durationMinutes: params.durationMinutes as number,
          category: params.category as string || 'INTERNAL',
          billable: true
        },
        include: { member: { select: { name: true } }, task: { select: { title: true } } }
      })

      const hours = Math.round(entry.durationMinutes / 60 * 10) / 10

      return {
        success: true,
        message: `⏱️ ${hours}h registradas para ${entry.member.name}${entry.task ? ` en "${entry.task.title}"` : ''}`,
        data: entry
      }
    }

    case 'list_time_entries': {
      actions.push({ id: actionId(), type: 'reading', entity: 'time_entry', description: 'Consultando registros...', timestamp: Date.now() })

      const periodDays = params.period === 'today' ? 1 : params.period === 'month' ? 30 : 7
      const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)

      const where: Record<string, unknown> = { date: { gte: since } }
      if (params.memberName) {
        const member = await findMemberByName(params.memberName as string)
        if (member) where.memberId = member.id
      }

      const entries = await prisma.timeEntry.findMany({
        where,
        include: { member: { select: { name: true } }, task: { select: { title: true } } },
        orderBy: { date: 'desc' },
        take: 20
      })

      const totalHours = Math.round(entries.reduce((sum, e) => sum + e.durationMinutes / 60, 0) * 10) / 10

      // Group by member
      const byMember: Record<string, number> = {}
      entries.forEach(e => {
        byMember[e.member.name] = (byMember[e.member.name] || 0) + e.durationMinutes / 60
      })

      const breakdown = Object.entries(byMember).map(([name, hours]) => `• ${name}: ${Math.round(hours * 10) / 10}h`).join('\n')

      return {
        success: true,
        message: `⏰ **Tiempo (${periodDays === 1 ? 'hoy' : periodDays === 30 ? 'último mes' : 'última semana'}): ${totalHours}h**\n\n${breakdown}`,
        data: entries
      }
    }

    // ==================== MEETINGS ====================
    case 'create_meeting': {
      const creator = await prisma.member.findFirst({ where: { isActive: true } })
      if (!creator) return { success: false, message: 'No hay miembros para crear reunión' }

      actions.push({ id: actionId(), type: 'creating', entity: 'meeting', description: `Creando reunión...`, timestamp: Date.now() })

      const meeting = await prisma.meeting.create({
        data: {
          title: params.title as string || 'Nueva reunión',
          type: params.type as string || 'DAILY_STANDUP',
          createdById: creator.id,
          startTime: new Date()
        }
      })

      return { success: true, message: `📅 Reunión "${meeting.title}" creada`, data: meeting }
    }

    case 'start_meeting': {
      const meeting = await prisma.meeting.findFirst({
        where: { status: 'SCHEDULED' },
        orderBy: { startTime: 'asc' }
      })
      if (!meeting) return { success: false, message: 'No hay reuniones programadas' }

      actions.push({ id: actionId(), type: 'executing', entity: 'meeting', description: `Iniciando reunión...`, timestamp: Date.now() })

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'IN_PROGRESS', startTime: new Date() }
      })

      return { success: true, message: `🟢 Reunión "${meeting.title}" iniciada` }
    }

    case 'end_meeting': {
      const meeting = await prisma.meeting.findFirst({ where: { status: 'IN_PROGRESS' } })
      if (!meeting) return { success: false, message: 'No hay reuniones en progreso' }

      actions.push({ id: actionId(), type: 'executing', entity: 'meeting', description: `Finalizando reunión...`, timestamp: Date.now() })

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'COMPLETED', endTime: new Date() }
      })

      return { success: true, message: `🔴 Reunión "${meeting.title}" finalizada` }
    }

    case 'list_meetings': {
      actions.push({ id: actionId(), type: 'reading', entity: 'meeting', description: 'Consultando reuniones...', timestamp: Date.now() })

      const meetings = await prisma.meeting.findMany({
        include: { createdBy: { select: { name: true } } },
        orderBy: { startTime: 'desc' },
        take: 10
      })

      const list = meetings.map(m => `• ${m.type} "${m.title || 'Sin título'}" - ${m.status}`).join('\n')

      return {
        success: true,
        message: meetings.length > 0 ? `📅 **Reuniones:**\n\n${list}` : '📅 No hay reuniones',
        data: meetings
      }
    }

    // ==================== NOTIFICATIONS ====================
    case 'send_notification': {
      let memberId: string | undefined
      if (params.toName && params.toName !== 'all') {
        const member = await findMemberByName(params.toName as string)
        memberId = member?.id
      }

      actions.push({ id: actionId(), type: 'creating', entity: 'notification', description: `Enviando notificación...`, timestamp: Date.now() })

      if (params.toName === 'all' || !memberId) {
        // Notify all
        const members = await prisma.member.findMany({ where: { isActive: true } })
        for (const m of members) {
          await prisma.notification.create({
            data: {
              memberId: m.id,
              type: 'ACHIEVEMENT',
              channel: params.channel as string || 'IN_APP',
              subject: 'Notificación',
              message: params.message as string || 'Nueva notificación',
              status: 'SENT',
              sentAt: new Date()
            }
          })
        }
        return { success: true, message: `📢 Notificación enviada a todo el equipo` }
      }

      await prisma.notification.create({
        data: {
          memberId,
          type: 'ACHIEVEMENT',
          channel: params.channel as string || 'IN_APP',
          subject: 'Notificación',
          message: params.message as string,
          status: 'SENT',
          sentAt: new Date()
        }
      })

      return { success: true, message: `📢 Notificación enviada` }
    }

    // ==================== AI CHECK-INS ====================
    case 'request_checkin': {
      let memberId: string | undefined
      if (params.memberName) {
        const member = await findMemberByName(params.memberName as string)
        memberId = member?.id
      }
      if (!memberId) {
        const first = await prisma.member.findFirst({ where: { isActive: true } })
        memberId = first?.id
      }
      if (!memberId) return { success: false, message: 'No hay miembros disponibles' }

      let taskId: string | undefined
      if (params.taskTitle) {
        const task = await findTaskByTitle(params.taskTitle as string)
        taskId = task?.id
      }

      actions.push({ id: actionId(), type: 'creating', entity: 'checkin', description: `Solicitando check-in...`, timestamp: Date.now() })

      const checkin = await prisma.aICheckin.create({
        data: {
          memberId,
          taskId,
          type: 'TEXT'
        },
        include: { member: { select: { name: true } } }
      })

      return { success: true, message: `📋 Check-in solicitado a ${checkin.member.name}` }
    }

    // ==================== REPORTS & ANALYTICS ====================
    case 'generate_report': {
      actions.push({ id: actionId(), type: 'analyzing', entity: 'report', description: 'Generando reporte...', timestamp: Date.now() })

      const periodDays = params.type === 'monthly' ? 30 : params.type === 'weekly' ? 7 : 1
      const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)

      const [tasks, timeEntries, members] = await Promise.all([
        prisma.task.findMany({ where: { updatedAt: { gte: since } }, include: { owner: { select: { name: true } } } }),
        prisma.timeEntry.findMany({ where: { date: { gte: since } }, include: { member: { select: { name: true } } } }),
        prisma.member.findMany({ where: { isActive: true } })
      ])

      const completed = tasks.filter(t => t.status === 'DONE').length
      const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
      const blocked = tasks.filter(t => t.status === 'BLOCKED').length
      const totalHours = Math.round(timeEntries.reduce((sum, e) => sum + e.durationMinutes / 60, 0))

      return {
        success: true,
        message: `📊 **Reporte ${params.type === 'monthly' ? 'Mensual' : params.type === 'weekly' ? 'Semanal' : 'Diario'}**

📋 **Tareas:**
• Completadas: ${completed}
• En progreso: ${inProgress}
• Bloqueadas: ${blocked}

⏰ **Tiempo:** ${totalHours}h registradas
👥 **Equipo:** ${members.length} miembros activos`,
        data: { completed, inProgress, blocked, totalHours, memberCount: members.length }
      }
    }

    case 'analyze_performance': {
      actions.push({ id: actionId(), type: 'analyzing', entity: 'performance', description: 'Analizando rendimiento...', timestamp: Date.now() })

      const periodDays = params.period === 'month' ? 30 : 7
      const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)

      let where: Record<string, unknown> = { isActive: true }
      if (params.memberName) {
        const member = await findMemberByName(params.memberName as string)
        if (member) where.id = member.id
      }

      const members = await prisma.member.findMany({
        where,
        include: {
          tasks: true,
          timeEntries: { where: { date: { gte: since } } }
        }
      })

      const analysis = members.map(m => {
        const completed = m.tasks.filter(t => t.status === 'DONE').length
        const total = m.tasks.length
        const hours = Math.round(m.timeEntries.reduce((sum, e) => sum + e.durationMinutes / 60, 0))
        const rate = total > 0 ? Math.round(completed / total * 100) : 0
        return { name: m.name, completed, total, hours, rate }
      }).sort((a, b) => b.rate - a.rate)

      const report = analysis.map((a, i) => `${i + 1}. ${a.name}: ${a.rate}% (${a.completed}/${a.total}) - ${a.hours}h`).join('\n')

      return {
        success: true,
        message: `📈 **Análisis de Rendimiento (${periodDays}d)**\n\n${report}`,
        data: analysis
      }
    }

    // ==================== SYSTEM ====================
    case 'get_overview': {
      actions.push({ id: actionId(), type: 'analyzing', entity: 'system', description: 'Generando panorama del sistema...', timestamp: Date.now() })

      const [members, tasks, timeEntries, meetings, onlineMembers, blockedTasks, overdueTasks] = await Promise.all([
        prisma.member.count({ where: { isActive: true } }),
        prisma.task.findMany({ where: { status: { not: 'DONE' } } }),
        prisma.timeEntry.findMany({ where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
        prisma.meeting.count({ where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
        prisma.member.findMany({ where: { officeStatus: { not: 'OFFLINE' }, isActive: true }, select: { name: true, officeStatus: true } }),
        prisma.task.count({ where: { status: 'BLOCKED' } }),
        prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { not: 'DONE' } } })
      ])

      const totalHours = Math.round(timeEntries.reduce((sum, e) => sum + e.durationMinutes / 60, 0))
      const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progressPercent, 0) / tasks.length) : 0

      const statusEmoji: Record<string, string> = { 'ONLINE': '🟢', 'BUSY': '🔴', 'AWAY': '🟡', 'IN_MEETING': '🟣' }
      const onlineList = onlineMembers.map(m => `${statusEmoji[m.officeStatus] || '⚪'} ${m.name}`).join(', ')

      return {
        success: true,
        message: `🤖 **JARVIS - Panel de Control**

👥 **Equipo:** ${members} miembros (${onlineMembers.length} online)
${onlineList}

📋 **Tareas:**
• Activas: ${tasks.length} (${avgProgress}% progreso promedio)
• Bloqueadas: ${blockedTasks} ⚠️
• Vencidas: ${overdueTasks} 🔴

⏰ **Tiempo (7d):** ${totalHours}h registradas
📅 **Reuniones:** ${meetings} pendientes`,
        data: { members, tasks: tasks.length, blockedTasks, overdueTasks, totalHours, onlineCount: onlineMembers.length },
        suggestions: [
          'Ver tareas bloqueadas',
          'Analizar rendimiento',
          'Crear nueva tarea',
          'Ver equipo'
        ]
      }
    }

    case 'health_check': {
      actions.push({ id: actionId(), type: 'analyzing', entity: 'system', description: 'Ejecutando diagnóstico...', timestamp: Date.now() })

      const issues: string[] = []

      // Check for blocked tasks
      const blocked = await prisma.task.count({ where: { status: 'BLOCKED' } })
      if (blocked > 0) issues.push(`⚠️ ${blocked} tareas bloqueadas`)

      // Check for overdue tasks
      const overdue = await prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { not: 'DONE' } } })
      if (overdue > 0) issues.push(`🔴 ${overdue} tareas vencidas`)

      // Check for stale tasks (no update in 3 days)
      const stale = await prisma.task.count({
        where: {
          status: { notIn: ['DONE'] },
          lastCheckinAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        }
      })
      if (stale > 0) issues.push(`⏳ ${stale} tareas sin actualización (3+ días)`)

      // Check for members without tasks
      const membersWithoutTasks = await prisma.member.count({
        where: { isActive: true, tasks: { none: { status: { not: 'DONE' } } } }
      })
      if (membersWithoutTasks > 0) issues.push(`👤 ${membersWithoutTasks} miembros sin tareas activas`)

      return {
        success: true,
        message: issues.length > 0
          ? `🏥 **Diagnóstico del Sistema**\n\n${issues.join('\n')}`
          : `✅ **Sistema Saludable** - No se encontraron problemas`,
        data: { issues, healthy: issues.length === 0 }
      }
    }

    // ==================== BULK OPERATIONS ====================
    case 'bulk_complete': {
      actions.push({ id: actionId(), type: 'executing', entity: 'task', description: 'Completando tareas en lote...', timestamp: Date.now() })

      const where: Record<string, unknown> = { status: { not: 'DONE' } }
      if (params.status) where.status = params.status
      if (params.ownerName) {
        const member = await findMemberByName(params.ownerName as string)
        if (member) where.ownerId = member.id
      }

      const result = await prisma.task.updateMany({
        where,
        data: { status: 'DONE', progressPercent: 100, completedAt: new Date() }
      })

      return { success: true, message: `✅ ${result.count} tareas completadas` }
    }

    case 'bulk_assign': {
      const member = params.ownerName ? await findMemberByName(params.ownerName as string) : null
      if (!member) return { success: false, message: 'No encontré al miembro' }

      actions.push({ id: actionId(), type: 'executing', entity: 'task', description: `Asignando tareas a ${member.name}...`, timestamp: Date.now() })

      const result = await prisma.task.updateMany({
        where: { status: { not: 'DONE' }, ownerId: null },
        data: { ownerId: member.id }
      })

      return { success: true, message: `✅ ${result.count} tareas asignadas a ${member.name}` }
    }

    // ==================== FOCUS ====================
    case 'set_focus': {
      const task = params.taskTitle ? await findTaskByTitle(params.taskTitle as string) : null
      if (!task) return { success: false, message: 'No encontré la tarea' }

      actions.push({ id: actionId(), type: 'updating', entity: 'focus', description: `Estableciendo foco en "${task.title}"...`, timestamp: Date.now() })

      // Clear other focus
      await prisma.task.updateMany({ where: { currentFocus: true }, data: { currentFocus: false } })
      await prisma.task.update({ where: { id: task.id }, data: { currentFocus: true } })

      return { success: true, message: `🎯 Enfocado en: "${task.title}"` }
    }

    // ==================== HELP ====================
    case 'show_help': {
      return {
        success: true,
        message: `🤖 **J.A.R.V.I.S. - Comandos Disponibles**

**📋 Tareas:**
• "Crear tarea 'nombre' para [persona] con prioridad alta"
• "Completar/Terminar tarea 'nombre'"
• "Bloquear/Desbloquear tarea 'nombre'"
• "Asignar tarea 'nombre' a [persona]"
• "Mostrar tareas [pendientes/bloqueadas/vencidas/de persona]"
• "Actualizar progreso de 'nombre' al 50%"

**👥 Equipo:**
• "Agregar miembro [nombre] como [rol]"
• "Ver equipo / Quién está online"
• "Eliminar miembro [nombre]"

**🏢 Oficina Virtual:**
• "Cambiar mi estado a [online/ocupado/ausente]"
• "Ir a [zona/sala]"
• "Enviar mensaje a [persona]: 'texto'"
• "Saludar a [persona]"

**⏱️ Tiempo:**
• "Registrar 3 horas para [persona] en 'tarea'"
• "Ver horas de [hoy/semana/mes]"

**📅 Reuniones:**
• "Crear reunión 'nombre'"
• "Iniciar/Finalizar reunión"
• "Ver reuniones"

**📊 Análisis:**
• "Resumen del sistema"
• "Analizar rendimiento"
• "Generar reporte [diario/semanal/mensual]"
• "Diagnóstico del sistema"

**🔔 Notificaciones:**
• "Notificar a [persona/equipo]: 'mensaje'"

**⚡ Operaciones en Lote:**
• "Completar todas las tareas de [persona]"
• "Asignar todas las tareas sin dueño a [persona]"`,
        suggestions: ['Resumen del sistema', 'Ver tareas', 'Ver equipo']
      }
    }

    // ==================== DEFAULT ====================
    case 'general_response':
    default:
      return {
        success: true,
        message: `Entendí tu mensaje. Prueba comandos como:
• "Resumen del sistema" - Ver panorama completo
• "Crear tarea 'nombre'" - Nueva tarea
• "Ver equipo" - Estado del equipo
• "Ayuda" - Ver todos los comandos`,
        suggestions: ['Resumen del sistema', 'Ver tareas', 'Ayuda']
      }
  }
}

// ============================================================
// API HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { command, context } = await request.json()

    if (!command) {
      return NextResponse.json({ error: 'Se requiere un comando' }, { status: 400 })
    }

    const actions: AgentAction[] = []

    // Initial thinking action
    actions.push({
      id: actionId(),
      type: 'thinking',
      description: 'Procesando comando...',
      timestamp: Date.now()
    })

    // Parse the command
    const parsed = parseCommand(command)

    actions.push({
      id: actionId(),
      type: 'thinking',
      description: `Detecté: ${parsed.intent} ${parsed.entity} (${Math.round(parsed.confidence * 100)}% confianza)`,
      data: { intent: parsed.intent, entity: parsed.entity, action: parsed.action },
      timestamp: Date.now()
    })

    // Execute the command
    const result = await executeCommand(parsed, actions)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      actions,
      result: result.data,
      suggestions: result.suggestions
    } as AgentResponse)

  } catch (error) {
    console.error('JARVIS Agent error:', error)
    return NextResponse.json({
      success: false,
      message: 'Error procesando el comando. Por favor intenta de nuevo.',
      actions: [{
        id: actionId(),
        type: 'error',
        description: String(error),
        timestamp: Date.now()
      }]
    }, { status: 500 })
  }
}
