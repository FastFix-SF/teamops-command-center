'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Meeting {
  id: string
  type: string
  title: string | null
  startTime: string
  status: string
  createdBy: { id: string; name: string }
  responses: any[]
}

interface Member {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
  priority: string
}

export default function MeetingsPage() {
  const searchParams = useSearchParams()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showNewMeeting, setShowNewMeeting] = useState(searchParams.get('new') === 'true')
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null)
  const [standupForm, setStandupForm] = useState({
    memberId: '',
    whatImDoingNow: '',
    topPriorityTaskId: '',
    progressPercentUpdate: 50,
    blockers: '',
    nextActions: '',
    confidence: 4
  })

  const loadMeetings = () => {
    fetch('/api/meetings').then(r => r.json()).then(setMeetings)
  }

  useEffect(() => {
    loadMeetings()
    fetch('/api/members').then(r => r.json()).then(setMembers)
    fetch('/api/tasks').then(r => r.json()).then(setTasks)
  }, [])

  const startMeeting = async (type: string) => {
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        createdById: members[0]?.id, // Default to first member
        sendNotifications: true
      })
    })
    const meeting = await res.json()
    setActiveMeeting(meeting)
    setShowNewMeeting(false)
    loadMeetings()
  }

  const submitStandupResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeMeeting) return

    await fetch('/api/meetings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId: activeMeeting.id,
        ...standupForm
      })
    })

    // Reset form for next person
    setStandupForm({
      memberId: '',
      whatImDoingNow: '',
      topPriorityTaskId: '',
      progressPercentUpdate: 50,
      blockers: '',
      nextActions: '',
      confidence: 4
    })

    // Reload meeting to see updated responses
    fetch(`/api/meetings`).then(r => r.json()).then(data => {
      const updated = data.find((m: Meeting) => m.id === activeMeeting.id)
      if (updated) setActiveMeeting(updated)
    })
  }

  const getRespondedMembers = (meeting: Meeting) => {
    return meeting.responses.map(r => r.member.id)
  }

  const getMeetingTypeColor = (type: string) => {
    if (type.includes('DAILY')) return 'bg-green-100 text-green-700'
    if (type.includes('WEEKLY')) return 'bg-blue-100 text-blue-700'
    return 'bg-purple-100 text-purple-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reuniones</h1>
          <p className="text-gray-500">Gestionar standups, planificación y revisiones</p>
        </div>
        <button onClick={() => setShowNewMeeting(true)} className="btn btn-primary">
          + Iniciar Reunión
        </button>
      </div>

      {/* Start New Meeting */}
      {showNewMeeting && !activeMeeting && (
        <div className="card bg-blue-50 border-blue-200">
          <h2 className="card-header">Iniciar Nueva Reunión</h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => startMeeting('DAILY_STANDUP')}
              className="p-6 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
            >
              <div className="text-3xl mb-2">📅</div>
              <div className="font-bold">Standup Diario</div>
              <div className="text-sm opacity-80">Sincronización rápida, 15 min</div>
            </button>
            <button
              onClick={() => startMeeting('WEEKLY_PLANNING')}
              className="p-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
            >
              <div className="text-3xl mb-2">📋</div>
              <div className="font-bold">Planificación Semanal</div>
              <div className="text-sm opacity-80">Planificar la semana</div>
            </button>
            <button
              onClick={() => startMeeting('MONTHLY_REVIEW')}
              className="p-6 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
            >
              <div className="text-3xl mb-2">📊</div>
              <div className="font-bold">Revisión Mensual</div>
              <div className="text-sm opacity-80">Rendimiento y bonos</div>
            </button>
          </div>
          <button onClick={() => setShowNewMeeting(false)} className="mt-4 text-gray-500 hover:underline">
            Cancelar
          </button>
        </div>
      )}

      {/* Active Meeting - Standup Form */}
      {activeMeeting && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-header mb-0">
              🎙️ {activeMeeting.type.replace(/_/g, ' ')} en Progreso
            </h2>
            <button onClick={() => setActiveMeeting(null)} className="btn btn-secondary">
              Terminar Reunión
            </button>
          </div>

          {/* Who has responded */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Estado del Equipo:</h3>
            <div className="flex gap-2 flex-wrap">
              {members.map(m => {
                const hasResponded = getRespondedMembers(activeMeeting).includes(m.id)
                return (
                  <span
                    key={m.id}
                    className={`px-3 py-1 rounded-full text-sm ${
                      hasResponded ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {hasResponded ? '✓' : '○'} {m.name}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Standup Form */}
          <form onSubmit={submitStandupResponse} className="space-y-4 bg-white p-4 rounded-lg">
            <h3 className="font-bold text-lg">Enviar Tu Actualización</h3>

            <div>
              <label className="label">¿Quién eres? *</label>
              <select
                className="input"
                value={standupForm.memberId}
                onChange={e => setStandupForm({ ...standupForm, memberId: e.target.value })}
                required
              >
                <option value="">Selecciona tu nombre</option>
                {members.filter(m => !getRespondedMembers(activeMeeting).includes(m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">¿En qué estás trabajando ahora?</label>
              <textarea
                className="input"
                rows={2}
                value={standupForm.whatImDoingNow}
                onChange={e => setStandupForm({ ...standupForm, whatImDoingNow: e.target.value })}
                placeholder="Actualmente estoy enfocado en..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tarea Prioritaria</label>
                <select
                  className="input"
                  value={standupForm.topPriorityTaskId}
                  onChange={e => setStandupForm({ ...standupForm, topPriorityTaskId: e.target.value })}
                >
                  <option value="">Seleccionar tarea</option>
                  {tasks.filter(t => t.priority === 'P0' || t.priority === 'P1').map(t => (
                    <option key={t.id} value={t.id}>[{t.priority}] {t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Progreso: {standupForm.progressPercentUpdate}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="w-full"
                  value={standupForm.progressPercentUpdate}
                  onChange={e => setStandupForm({ ...standupForm, progressPercentUpdate: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="label">¿Algún bloqueador? 🚧</label>
              <input
                type="text"
                className="input"
                value={standupForm.blockers}
                onChange={e => setStandupForm({ ...standupForm, blockers: e.target.value })}
                placeholder="¿Qué te está bloqueando? (dejar vacío si no hay)"
              />
            </div>

            <div>
              <label className="label">Próximas acciones</label>
              <input
                type="text"
                className="input"
                value={standupForm.nextActions}
                onChange={e => setStandupForm({ ...standupForm, nextActions: e.target.value })}
                placeholder="¿Qué harás después?"
              />
            </div>

            <div>
              <label className="label">Nivel de Confianza (1-5): {standupForm.confidence}</label>
              <input
                type="range"
                min="1"
                max="5"
                className="w-full"
                value={standupForm.confidence}
                onChange={e => setStandupForm({ ...standupForm, confidence: parseInt(e.target.value) })}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>😟 Preocupado</span>
                <span>😐 Neutral</span>
                <span>😊 Confiado</span>
              </div>
            </div>

            <button type="submit" className="btn btn-success w-full">
              ✓ Enviar Actualización
            </button>
          </form>

          {/* Responses so far */}
          {activeMeeting.responses.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-3">Respuestas:</h3>
              <div className="space-y-3">
                {activeMeeting.responses.map((r: any) => (
                  <div key={r.id} className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">{r.member.name}</span>
                      <span className="text-sm text-gray-500">
                        Confianza: {'⭐'.repeat(r.confidence || 0)}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      {r.whatImDoingNow && <p>🎯 <strong>Haciendo:</strong> {r.whatImDoingNow}</p>}
                      {r.topPriorityTask && <p>📋 <strong>Tarea:</strong> {r.topPriorityTask.title}</p>}
                      {r.blockers && <p className="text-purple-600">🚧 <strong>Bloqueado:</strong> {r.blockers}</p>}
                      {r.nextActions && <p>➡️ <strong>Siguiente:</strong> {r.nextActions}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past Meetings */}
      <div className="card">
        <h2 className="card-header">Historial de Reuniones</h2>
        {meetings.length === 0 ? (
          <p className="text-gray-500">Sin reuniones aún. ¡Inicia tu primera reunión!</p>
        ) : (
          <div className="space-y-3">
            {meetings.map(meeting => (
              <div
                key={meeting.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setActiveMeeting(meeting)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMeetingTypeColor(meeting.type)}`}>
                      {meeting.type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{meeting.title}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {new Date(meeting.startTime).toLocaleDateString()} at {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs text-gray-400">
                      {meeting.responses.length}/{members.length} respuestas
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
