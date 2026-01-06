'use client'

import { useEffect, useState } from 'react'

interface TimeEntry {
  id: string
  memberId: string
  member: { id: string; name: string }
  taskId: string | null
  task: { id: string; title: string } | null
  date: string
  durationMinutes: number
  category: string
  billable: boolean
  hourlyRate: number | null
  notes: string | null
}

interface Member {
  id: string
  name: string
  hourlyRate: number
}

interface Task {
  id: string
  title: string
}

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showModal, setShowModal] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStart, setTimerStart] = useState<Date | null>(null)
  const [timerMember, setTimerMember] = useState('')
  const [timerTask, setTimerTask] = useState('')
  const [timerElapsed, setTimerElapsed] = useState(0)

  const [formData, setFormData] = useState({
    memberId: '',
    taskId: '',
    date: new Date().toISOString().split('T')[0],
    hours: 1,
    minutes: 0,
    category: 'CLIENT_WORK',
    billable: true,
    notes: ''
  })

  const loadEntries = () => {
    const month = new Date().toISOString().slice(0, 7)
    fetch(`/api/time?month=${month}`).then(r => r.json()).then(setEntries)
  }

  useEffect(() => {
    loadEntries()
    fetch('/api/members').then(r => r.json()).then(setMembers)
    fetch('/api/tasks').then(r => r.json()).then(setTasks)
  }, [])

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerRunning && timerStart) {
      interval = setInterval(() => {
        setTimerElapsed(Math.floor((Date.now() - timerStart.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning, timerStart])

  const startTimer = () => {
    if (!timerMember) {
      alert('Por favor selecciona un miembro del equipo primero')
      return
    }
    setTimerStart(new Date())
    setTimerRunning(true)
    setTimerElapsed(0)
  }

  const stopTimer = async () => {
    if (!timerStart) return

    const durationMinutes = Math.round(timerElapsed / 60)

    await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: timerMember,
        taskId: timerTask || null,
        date: new Date().toISOString(),
        durationMinutes,
        category: 'CLIENT_WORK',
        billable: true,
        notes: 'Registro de temporizador'
      })
    })

    setTimerRunning(false)
    setTimerStart(null)
    setTimerElapsed(0)
    loadEntries()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const durationMinutes = formData.hours * 60 + formData.minutes

    await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: formData.memberId,
        taskId: formData.taskId || null,
        date: formData.date,
        durationMinutes,
        category: formData.category,
        billable: formData.billable,
        notes: formData.notes
      })
    })

    setShowModal(false)
    setFormData({
      memberId: '', taskId: '', date: new Date().toISOString().split('T')[0],
      hours: 1, minutes: 0, category: 'CLIENT_WORK', billable: true, notes: ''
    })
    loadEntries()
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return
    await fetch('/api/time', { method: 'DELETE', body: JSON.stringify({ id }) })
    loadEntries()
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
  }

  const formatTimerElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Calculate totals
  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0)
  const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + e.durationMinutes, 0)
  const totalValue = entries
    .filter(e => e.billable && e.hourlyRate)
    .reduce((sum, e) => sum + (e.durationMinutes / 60) * (e.hourlyRate || 0), 0)

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      CLIENT_WORK: 'bg-green-100 text-green-700',
      INTERNAL: 'bg-blue-100 text-blue-700',
      SALES: 'bg-yellow-100 text-yellow-700',
      R_AND_D: 'bg-purple-100 text-purple-700',
      ADMIN: 'bg-gray-100 text-gray-700'
    }
    return colors[cat] || colors.INTERNAL
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Control de Tiempo</h1>
          <p className="text-gray-500">Registrar y gestionar horas de trabajo</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Agregar Registro
        </button>
      </div>

      {/* Timer */}
      <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <h2 className="font-bold text-lg mb-4">⏱️ Temporizador Rápido</h2>
        <div className="flex items-center gap-4">
          <select
            className="input bg-white/20 border-white/30 text-white placeholder-white/50"
            value={timerMember}
            onChange={e => setTimerMember(e.target.value)}
            disabled={timerRunning}
          >
            <option value="">Seleccionar miembro</option>
            {members.map(m => (
              <option key={m.id} value={m.id} className="text-gray-900">{m.name}</option>
            ))}
          </select>
          <select
            className="input bg-white/20 border-white/30 text-white"
            value={timerTask}
            onChange={e => setTimerTask(e.target.value)}
            disabled={timerRunning}
          >
            <option value="">Seleccionar tarea (opcional)</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id} className="text-gray-900">{t.title}</option>
            ))}
          </select>
          <div className="text-4xl font-mono font-bold min-w-[150px]">
            {formatTimerElapsed(timerElapsed)}
          </div>
          {!timerRunning ? (
            <button onClick={startTimer} className="btn bg-white text-blue-600 hover:bg-blue-50">
              ▶ Iniciar
            </button>
          ) : (
            <button onClick={stopTimer} className="btn bg-red-500 text-white hover:bg-red-600">
              ⏹ Detener y Guardar
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value">{formatDuration(totalMinutes)}</div>
          <div className="stat-label">Horas Totales (Este Mes)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-600">{formatDuration(billableMinutes)}</div>
          <div className="stat-label">Horas Facturables</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-blue-600">{((billableMinutes / totalMinutes) * 100 || 0).toFixed(0)}%</div>
          <div className="stat-label">Tasa de Utilización</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-600">${totalValue.toFixed(0)}</div>
          <div className="stat-label">Valor Generado</div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Miembro</th>
              <th>Tarea</th>
              <th>Duración</th>
              <th>Categoría</th>
              <th>Facturable</th>
              <th>Valor</th>
              <th>Notas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id} className={entry.billable ? 'bg-green-50' : ''}>
                <td>{new Date(entry.date).toLocaleDateString()}</td>
                <td className="font-medium">{entry.member.name}</td>
                <td>{entry.task?.title || '-'}</td>
                <td>{formatDuration(entry.durationMinutes)}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(entry.category)}`}>
                    {entry.category.replace(/_/g, ' ')}
                  </span>
                </td>
                <td>{entry.billable ? '✓ Sí' : 'No'}</td>
                <td className="font-medium">
                  {entry.billable && entry.hourlyRate
                    ? `$${((entry.durationMinutes / 60) * entry.hourlyRate).toFixed(0)}`
                    : '-'}
                </td>
                <td className="text-sm text-gray-500">{entry.notes || '-'}</td>
                <td>
                  <button onClick={() => deleteEntry(entry.id)} className="text-red-600 hover:underline text-sm">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Agregar Registro de Tiempo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Miembro *</label>
                  <select
                    className="input"
                    value={formData.memberId}
                    onChange={e => setFormData({ ...formData, memberId: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar miembro</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Fecha *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Tarea (opcional)</label>
                <select
                  className="input"
                  value={formData.taskId}
                  onChange={e => setFormData({ ...formData, taskId: e.target.value })}
                >
                  <option value="">Trabajo general (sin tarea)</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Horas</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    className="input"
                    value={formData.hours}
                    onChange={e => setFormData({ ...formData, hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Minutos</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="input"
                    value={formData.minutes}
                    onChange={e => setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Categoría</label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="CLIENT_WORK">Trabajo Cliente</option>
                    <option value="INTERNAL">Interno</option>
                    <option value="SALES">Ventas</option>
                    <option value="R_AND_D">I+D</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="billable"
                    checked={formData.billable}
                    onChange={e => setFormData({ ...formData, billable: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="billable">Facturable</label>
                </div>
              </div>

              <div>
                <label className="label">Notas</label>
                <input
                  type="text"
                  className="input"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="¿En qué trabajaste?"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">Agregar Registro</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
