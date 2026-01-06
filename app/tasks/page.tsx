'use client'

import { useEffect, useState } from 'react'

interface Task {
  id: string
  title: string
  description: string | null
  ownerId: string
  owner: { id: string; name: string }
  priority: string
  status: string
  progressPercent: number
  dueDate: string | null
  blockerNotes: string | null
  currentFocus: boolean
  createdAt: string
}

interface Member {
  id: string
  name: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    title: '', description: '', ownerId: '', priority: 'P2', status: 'NOT_STARTED',
    progressPercent: 0, dueDate: '', blockerNotes: '', currentFocus: false
  })

  const loadTasks = () => {
    const url = filter === 'all' ? '/api/tasks' : `/api/tasks?view=${filter}`
    fetch(url).then(r => r.json()).then(setTasks)
  }

  useEffect(() => {
    loadTasks()
    fetch('/api/members').then(r => r.json()).then(setMembers)
  }, [filter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editingTask ? 'PUT' : 'POST'
    const body = editingTask ? { id: editingTask.id, ...formData } : formData

    await fetch('/api/tasks', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    setShowModal(false)
    setEditingTask(null)
    setFormData({ title: '', description: '', ownerId: '', priority: 'P2', status: 'NOT_STARTED', progressPercent: 0, dueDate: '', blockerNotes: '', currentFocus: false })
    loadTasks()
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      ownerId: task.ownerId,
      priority: task.priority,
      status: task.status,
      progressPercent: task.progressPercent,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      blockerNotes: task.blockerNotes || '',
      currentFocus: task.currentFocus
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await fetch('/api/tasks', { method: 'DELETE', body: JSON.stringify({ id }) })
    loadTasks()
  }

  const handleQuickUpdate = async (task: Task, updates: Partial<Task>) => {
    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, ...updates })
    })
    loadTasks()
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NOT_STARTED: 'bg-gray-200 text-gray-700',
      IN_PROGRESS: 'bg-blue-100 text-blue-700',
      BLOCKED: 'bg-purple-100 text-purple-700',
      DONE: 'bg-green-100 text-green-700'
    }
    return colors[status] || colors.NOT_STARTED
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      P0: 'bg-red-500 text-white',
      P1: 'bg-orange-500 text-white',
      P2: 'bg-blue-500 text-white',
      P3: 'bg-gray-400 text-white'
    }
    return colors[priority] || colors.P2
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tareas</h1>
          <p className="text-gray-500">Gestionar todas las tareas del equipo</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Nueva Tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'Todas' },
          { value: 'urgent', label: '🔥 Urgentes' },
          { value: 'overdue', label: '⚠️ Vencidas' },
          { value: 'blocked', label: '🚧 Bloqueadas' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla de Tareas */}
      <div className="card overflow-hidden p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Prioridad</th>
              <th>Título</th>
              <th>Responsable</th>
              <th>Estado</th>
              <th>Progreso</th>
              <th>Fecha Límite</th>
              <th>Enfoque</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => {
              const daysLeft = task.dueDate
                ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <tr key={task.id} className={task.status === 'BLOCKED' ? 'bg-purple-50' : daysLeft !== null && daysLeft < 0 && task.status !== 'DONE' ? 'bg-red-50' : ''}>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>
                    <div className="font-medium">{task.title}</div>
                    {task.blockerNotes && (
                      <div className="text-xs text-purple-600">🚧 {task.blockerNotes}</div>
                    )}
                  </td>
                  <td>{task.owner.name}</td>
                  <td>
                    <select
                      value={task.status}
                      onChange={(e) => handleQuickUpdate(task, { status: e.target.value })}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${getStatusColor(task.status)}`}
                    >
                      <option value="NOT_STARTED">Sin Iniciar</option>
                      <option value="IN_PROGRESS">En Progreso</option>
                      <option value="BLOCKED">Bloqueada</option>
                      <option value="DONE">Completada</option>
                    </select>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={task.progressPercent}
                        onChange={(e) => handleQuickUpdate(task, { progressPercent: parseInt(e.target.value) })}
                        className="w-20"
                      />
                      <span className="text-sm font-medium">{task.progressPercent}%</span>
                    </div>
                  </td>
                  <td>
                    {task.dueDate ? (
                      <div className={daysLeft !== null && daysLeft < 0 && task.status !== 'DONE' ? 'text-red-600 font-bold' : ''}>
                        {new Date(task.dueDate).toLocaleDateString()}
                        {daysLeft !== null && task.status !== 'DONE' && (
                          <div className="text-xs">{daysLeft < 0 ? `${Math.abs(daysLeft)}d vencida` : `${daysLeft}d restantes`}</div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleQuickUpdate(task, { currentFocus: !task.currentFocus })}
                      className={`text-xl ${task.currentFocus ? '' : 'opacity-30'}`}
                    >
                      🎯
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(task)} className="text-blue-600 hover:underline text-sm">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="text-red-600 hover:underline text-sm">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Título *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Responsable *</label>
                  <select
                    className="input"
                    value={formData.ownerId}
                    onChange={e => setFormData({ ...formData, ownerId: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar responsable</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Prioridad</label>
                  <select
                    className="input"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="P0">P0 - Crítica</option>
                    <option value="P1">P1 - Alta</option>
                    <option value="P2">P2 - Media</option>
                    <option value="P3">P3 - Baja</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Estado</label>
                  <select
                    className="input"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="NOT_STARTED">Sin Iniciar</option>
                    <option value="IN_PROGRESS">En Progreso</option>
                    <option value="BLOCKED">Bloqueada</option>
                    <option value="DONE">Completada</option>
                  </select>
                </div>
                <div>
                  <label className="label">Fecha Límite</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Progreso: {formData.progressPercent}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="w-full"
                  value={formData.progressPercent}
                  onChange={e => setFormData({ ...formData, progressPercent: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Notas de Bloqueo</label>
                <input
                  type="text"
                  className="input"
                  value={formData.blockerNotes}
                  onChange={e => setFormData({ ...formData, blockerNotes: e.target.value })}
                  placeholder="¿Qué está bloqueando esta tarea?"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="currentFocus"
                  checked={formData.currentFocus}
                  onChange={e => setFormData({ ...formData, currentFocus: e.target.checked })}
                />
                <label htmlFor="currentFocus">🎯 Enfoque Actual</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingTask ? 'Actualizar Tarea' : 'Crear Tarea'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setEditingTask(null) }} className="btn btn-secondary">
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
