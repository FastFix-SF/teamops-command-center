'use client'

import { useEffect, useState } from 'react'

interface Notification {
  id: string
  memberId: string
  member: { id: string; name: string }
  type: string
  channel: string
  subject: string
  message: string
  status: string
  sentAt: string | null
  createdAt: string
}

interface Member {
  id: string
  name: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendForm, setSendForm] = useState({
    memberId: '',
    sendToAll: false,
    type: 'PROGRESS_UPDATE',
    message: ''
  })
  const [sending, setSending] = useState(false)

  const loadNotifications = () => {
    fetch('/api/notifications').then(r => r.json()).then(setNotifications)
  }

  useEffect(() => {
    loadNotifications()
    fetch('/api/members').then(r => r.json()).then(setMembers)
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendForm)
    })

    setSending(false)
    setShowSendModal(false)
    setSendForm({ memberId: '', sendToAll: false, type: 'PROGRESS_UPDATE', message: '' })
    loadNotifications()
  }

  const triggerAutomated = async (action: string) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
    loadNotifications()
    alert(`${action} notifications sent!`)
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      OVERDUE_ALERT: 'bg-red-100 text-red-700',
      MEETING_REMINDER: 'bg-blue-100 text-blue-700',
      PROGRESS_UPDATE: 'bg-green-100 text-green-700',
      ACHIEVEMENT: 'bg-yellow-100 text-yellow-700',
      LEADERBOARD: 'bg-purple-100 text-purple-700',
      BLOCKER_ALERT: 'bg-orange-100 text-orange-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  const getStatusColor = (status: string) => {
    if (status === 'SENT') return 'text-green-600'
    if (status === 'FAILED') return 'text-red-600'
    return 'text-yellow-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-500">Historial y controles de notificaciones SMS</p>
        </div>
        <button onClick={() => setShowSendModal(true)} className="btn btn-primary">
          📱 Enviar Notificación
        </button>
      </div>

      {/* Acciones Rápidas */}
      <div className="card">
        <h2 className="card-header">🚀 Acciones Rápidas</h2>
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => triggerAutomated('NOTIFY_OVERDUE')}
            className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-left"
          >
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-medium">Alertar Vencidas</div>
            <div className="text-xs text-gray-500">Notificar dueños de tareas vencidas</div>
          </button>
          <button
            onClick={() => triggerAutomated('NOTIFY_NO_CHECKIN')}
            className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 text-left"
          >
            <div className="text-2xl mb-2">⏰</div>
            <div className="font-medium">Check-ins Faltantes</div>
            <div className="text-xs text-gray-500">Recordar a miembros sin actualización</div>
          </button>
          <button
            onClick={() => triggerAutomated('NOTIFY_BLOCKERS')}
            className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 text-left"
          >
            <div className="text-2xl mb-2">🚧</div>
            <div className="font-medium">Alertas de Bloqueo</div>
            <div className="text-xs text-gray-500">Alertar líderes sobre tareas bloqueadas</div>
          </button>
          <button
            onClick={() => {
              setSendForm({ ...sendForm, sendToAll: true, type: 'LEADERBOARD', message: '🏆 ¡Revisa la última clasificación! ¿Estás en el top 3?' })
              setShowSendModal(true)
            }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-left"
          >
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-medium">Actualizar Clasificación</div>
            <div className="text-xs text-gray-500">Notificar al equipo de rankings</div>
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value">{notifications.length}</div>
          <div className="stat-label">Total Enviadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green-600">
            {notifications.filter(n => n.status === 'SENT').length}
          </div>
          <div className="stat-label">Entregadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-red-600">
            {notifications.filter(n => n.status === 'FAILED').length}
          </div>
          <div className="stat-label">Fallidas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-yellow-600">
            {notifications.filter(n => n.status === 'PENDING').length}
          </div>
          <div className="stat-label">Pendientes</div>
        </div>
      </div>

      {/* Historial de Notificaciones */}
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Destinatario</th>
              <th>Tipo</th>
              <th>Mensaje</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map(notif => (
              <tr key={notif.id}>
                <td className="text-sm text-gray-500">
                  {new Date(notif.createdAt).toLocaleString('es-ES')}
                </td>
                <td className="font-medium">{notif.member.name}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-xs ${getTypeColor(notif.type)}`}>
                    {notif.type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="text-sm max-w-md truncate">{notif.message}</td>
                <td className={`font-medium ${getStatusColor(notif.status)}`}>
                  {notif.status === 'SENT' ? '✓ Enviado' : notif.status === 'FAILED' ? '✗ Fallido' : '⏳ Pendiente'}
                </td>
              </tr>
            ))}
            {notifications.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-8">
                  Sin notificaciones enviadas aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Envío */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">📱 Enviar Notificación</h2>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="sendToAll"
                  checked={sendForm.sendToAll}
                  onChange={e => setSendForm({ ...sendForm, sendToAll: e.target.checked })}
                />
                <label htmlFor="sendToAll" className="font-medium">Enviar a todos los miembros</label>
              </div>

              {!sendForm.sendToAll && (
                <div>
                  <label className="label">Destinatario *</label>
                  <select
                    className="input"
                    value={sendForm.memberId}
                    onChange={e => setSendForm({ ...sendForm, memberId: e.target.value })}
                    required={!sendForm.sendToAll}
                  >
                    <option value="">Seleccionar miembro</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Tipo de Notificación</label>
                <select
                  className="input"
                  value={sendForm.type}
                  onChange={e => setSendForm({ ...sendForm, type: e.target.value })}
                >
                  <option value="PROGRESS_UPDATE">Actualización de Progreso</option>
                  <option value="OVERDUE_ALERT">Alerta de Vencida</option>
                  <option value="MEETING_REMINDER">Recordatorio de Reunión</option>
                  <option value="ACHIEVEMENT">Logro</option>
                  <option value="LEADERBOARD">Clasificación</option>
                  <option value="BLOCKER_ALERT">Alerta de Bloqueo</option>
                </select>
              </div>

              <div>
                <label className="label">Mensaje *</label>
                <textarea
                  className="input"
                  rows={4}
                  value={sendForm.message}
                  onChange={e => setSendForm({ ...sendForm, message: e.target.value })}
                  required
                  placeholder="Escribe tu mensaje..."
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">
                  💡 Consejo: ¡Usa emojis para hacer los mensajes más atractivos! Ejemplo: "🎯 ¡Gran progreso hoy! ¡Sigue así!"
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={sending} className="btn btn-primary flex-1">
                  {sending ? 'Enviando...' : '📱 Enviar SMS'}
                </button>
                <button type="button" onClick={() => setShowSendModal(false)} className="btn btn-secondary">
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
