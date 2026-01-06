'use client'

import { useState, useEffect, useCallback } from 'react'

interface Member {
  id: string
  name: string
  role: string
  avatarStyle: string
  avatarColor: string
  avatarAccessories: string | null
  officeStatus: string
  statusMessage: string | null
  lastSeenAt: string | null
  currentZone: string
  positionX: number
  positionY: number
  workspot: {
    gridX: number
    gridY: number
    deskStyle: string
    nameplate: string | null
  } | null
}

interface Zone {
  id: string
  name: string
  type: string
  gridX: number
  gridY: number
  width: number
  height: number
  icon: string
  color: string
}

interface OfficeMessage {
  id: string
  fromId: string
  message: string
  type: string
  from: { id: string; name: string }
}

// Avatar component with different styles
function Avatar({ member, size = 'md', showStatus = true, onClick }: {
  member: Member
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  onClick?: () => void
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base'
  }

  const statusColors: Record<string, string> = {
    'ONLINE': 'bg-emerald-500',
    'AWAY': 'bg-amber-500',
    'BUSY': 'bg-red-500',
    'IN_MEETING': 'bg-purple-500',
    'OFFLINE': 'bg-zinc-400'
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="relative inline-block" onClick={onClick}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white cursor-pointer hover:scale-110 transition-transform shadow-lg`}
        style={{ backgroundColor: member.avatarColor }}
      >
        {getInitials(member.name)}
      </div>
      {showStatus && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[member.officeStatus]} rounded-full border-2 border-white`} />
      )}
    </div>
  )
}

// Desk/Workspot component
function Desk({ member, isCurrentUser, onWave }: {
  member: Member
  isCurrentUser: boolean
  onWave: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`relative p-3 rounded-xl transition-all ${
        isCurrentUser
          ? 'bg-indigo-100 ring-2 ring-indigo-500'
          : member.officeStatus === 'OFFLINE'
          ? 'bg-zinc-100 opacity-60'
          : 'bg-white hover:bg-zinc-50'
      } shadow-sm`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Desk surface */}
      <div className="flex items-start gap-3">
        <Avatar member={member} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-zinc-900 text-sm truncate">{member.name}</p>
          <p className="text-xs text-zinc-500 truncate">{member.role}</p>
          {member.statusMessage && (
            <p className="text-xs text-zinc-400 italic mt-1 truncate">"{member.statusMessage}"</p>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className={`w-2 h-2 rounded-full ${
          member.officeStatus === 'ONLINE' ? 'bg-emerald-500' :
          member.officeStatus === 'AWAY' ? 'bg-amber-500' :
          member.officeStatus === 'BUSY' ? 'bg-red-500' :
          member.officeStatus === 'IN_MEETING' ? 'bg-purple-500' :
          'bg-zinc-400'
        }`} />
        <span className="text-xs text-zinc-500">
          {member.officeStatus === 'ONLINE' ? 'Disponible' :
           member.officeStatus === 'AWAY' ? 'Ausente' :
           member.officeStatus === 'BUSY' ? 'Ocupado' :
           member.officeStatus === 'IN_MEETING' ? 'En reunión' :
           'Desconectado'}
        </span>
      </div>

      {/* Action buttons */}
      {showActions && !isCurrentUser && member.officeStatus !== 'OFFLINE' && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          <button
            onClick={onWave}
            className="w-7 h-7 bg-amber-400 hover:bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors text-sm"
            title="Saludar"
          >
            👋
          </button>
        </div>
      )}

      {/* Decorations */}
      <div className="absolute -top-1 -left-1 text-lg opacity-70">
        {member.workspot?.deskStyle === 'creative' ? '🎨' :
         member.workspot?.deskStyle === 'minimal' ? '🪴' :
         member.workspot?.deskStyle === 'classic' ? '📚' : '💻'}
      </div>
    </div>
  )
}

// Zone component
function OfficeZone({ zone, occupants, onClick }: {
  zone: Zone
  occupants: Member[]
  onClick: () => void
}) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed border-zinc-200 p-4 cursor-pointer hover:border-zinc-300 transition-colors"
      style={{ backgroundColor: zone.color }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{zone.icon}</span>
        <span className="font-medium text-zinc-700">{zone.name}</span>
        {occupants.length > 0 && (
          <span className="px-2 py-0.5 bg-white/50 rounded-full text-xs text-zinc-600">
            {occupants.length} persona{occupants.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {occupants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {occupants.map(m => (
            <div key={m.id} className="flex items-center gap-1.5 bg-white/70 rounded-full px-2 py-1">
              <Avatar member={m} size="sm" showStatus={false} />
              <span className="text-xs text-zinc-700">{m.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OfficePage() {
  const [members, setMembers] = useState<Member[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [stats, setStats] = useState({ total: 0, online: 0, away: 0, busy: 0, inMeeting: 0, offline: 0 })
  const [messages, setMessages] = useState<OfficeMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [myStatus, setMyStatus] = useState('ONLINE')
  const [myStatusMessage, setMyStatusMessage] = useState('')
  const [myAvatarColor, setMyAvatarColor] = useState('#6366F1')
  const [isLoading, setIsLoading] = useState(true)

  // Load office data
  const loadOffice = useCallback(async () => {
    try {
      const res = await fetch('/api/office')
      const data = await res.json()
      setMembers(data.members || [])
      setZones(data.zones || [])
      setStats(data.stats || { total: 0, online: 0, away: 0, busy: 0, inMeeting: 0, offline: 0 })

      // Set first member as current user for demo
      if (!currentUserId && data.members?.length > 0) {
        setCurrentUserId(data.members[0].id)
        setMyStatus(data.members[0].officeStatus)
        setMyStatusMessage(data.members[0].statusMessage || '')
        setMyAvatarColor(data.members[0].avatarColor)
      }
    } catch (error) {
      console.error('Error loading office:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId])

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!currentUserId) return
    try {
      const res = await fetch(`/api/office?action=messages&memberId=${currentUserId}`)
      const data = await res.json()
      setMessages(data)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [currentUserId])

  useEffect(() => {
    loadOffice()
    // Poll every 5 seconds for real-time presence
    const interval = setInterval(loadOffice, 5000)
    return () => clearInterval(interval)
  }, [loadOffice])

  useEffect(() => {
    if (currentUserId) {
      loadMessages()
      const interval = setInterval(loadMessages, 10000)
      return () => clearInterval(interval)
    }
  }, [currentUserId, loadMessages])

  // Join office on load
  useEffect(() => {
    if (currentUserId) {
      fetch('/api/office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: currentUserId, action: 'join' })
      })
    }
  }, [currentUserId])

  // Wave at someone
  const handleWave = async (toId: string) => {
    if (!currentUserId) return
    await fetch('/api/office', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: currentUserId, toId, type: 'WAVE', message: '👋' })
    })
  }

  // Update status
  const updateStatus = async () => {
    if (!currentUserId) return
    await fetch('/api/office', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: currentUserId,
        action: 'status',
        status: myStatus,
        statusMessage: myStatusMessage
      })
    })
    setShowStatusModal(false)
    loadOffice()
  }

  // Update avatar
  const updateAvatar = async () => {
    if (!currentUserId) return
    await fetch('/api/office', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: currentUserId,
        action: 'avatar',
        color: myAvatarColor
      })
    })
    setShowAvatarModal(false)
    loadOffice()
  }

  // Mark messages as read
  const markMessagesRead = async () => {
    if (!currentUserId || messages.length === 0) return
    await fetch('/api/office', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: currentUserId })
    })
    setMessages([])
  }

  const currentUser = members.find(m => m.id === currentUserId)
  const deskMembers = members.filter(m => m.currentZone === 'desk')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500">Cargando oficina virtual...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Oficina Virtual</h1>
            <p className="text-zinc-500">Tu espacio de trabajo remoto</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicators */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-sm text-zinc-600">{stats.online}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                <span className="text-sm text-zinc-600">{stats.away}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-sm text-zinc-600">{stats.busy}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="text-sm text-zinc-600">{stats.inMeeting}</span>
              </div>
            </div>

            {/* Current user controls */}
            {currentUser && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm hover:shadow transition-shadow"
                >
                  <Avatar member={currentUser} size="sm" />
                  <span className="text-sm font-medium">{currentUser.name.split(' ')[0]}</span>
                </button>
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors text-sm"
                >
                  Personalizar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages notification */}
      {messages.length > 0 && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-amber-800">
                Tienes {messages.length} mensaje{messages.length !== 1 ? 's' : ''} nuevo{messages.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={markMessagesRead}
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                Marcar como leídos
              </button>
            </div>
            <div className="space-y-2">
              {messages.slice(0, 3).map(msg => (
                <div key={msg.id} className="flex items-center gap-2 text-sm text-amber-700">
                  <span className="font-medium">{msg.from.name}</span>
                  <span>te envió:</span>
                  <span>{msg.type === 'WAVE' ? '👋 un saludo' : msg.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Office Layout */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-6">
          {/* Main work area */}
          <div className="col-span-8">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">💻</span>
                <h2 className="font-semibold text-zinc-800">Área de Trabajo</h2>
                <span className="px-2 py-0.5 bg-zinc-100 rounded-full text-xs text-zinc-600">
                  {deskMembers.filter(m => m.officeStatus !== 'OFFLINE').length} activo{deskMembers.filter(m => m.officeStatus !== 'OFFLINE').length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Desk grid */}
              <div className="grid grid-cols-4 gap-4">
                {deskMembers.map(member => (
                  <Desk
                    key={member.id}
                    member={member}
                    isCurrentUser={member.id === currentUserId}
                    onWave={() => handleWave(member.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Side zones */}
          <div className="col-span-4 space-y-4">
            {/* Meeting rooms */}
            {zones.filter(z => z.type === 'MEETING_ROOM').map(zone => (
              <OfficeZone
                key={zone.id}
                zone={zone}
                occupants={members.filter(m => m.currentZone === zone.name && m.officeStatus !== 'OFFLINE')}
                onClick={() => {}}
              />
            ))}

            {/* Lounge */}
            {zones.filter(z => z.type === 'LOUNGE' || z.type === 'BREAK_ROOM').map(zone => (
              <OfficeZone
                key={zone.id}
                zone={zone}
                occupants={members.filter(m => m.currentZone === zone.name && m.officeStatus !== 'OFFLINE')}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Team Directory */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-zinc-800 mb-4">Directorio del Equipo</h2>
          <div className="grid grid-cols-6 gap-4">
            {members.map(member => (
              <div
                key={member.id}
                className={`text-center p-3 rounded-xl cursor-pointer transition-all ${
                  member.officeStatus === 'OFFLINE' ? 'opacity-50' : 'hover:bg-zinc-50'
                }`}
                onClick={() => setSelectedMember(member)}
              >
                <Avatar member={member} size="lg" />
                <p className="mt-2 text-sm font-medium text-zinc-800 truncate">{member.name.split(' ')[0]}</p>
                <p className="text-xs text-zinc-500 truncate">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Cambiar Estado</h3>

            <div className="space-y-3 mb-4">
              {[
                { value: 'ONLINE', label: 'Disponible', color: 'bg-emerald-500' },
                { value: 'AWAY', label: 'Ausente', color: 'bg-amber-500' },
                { value: 'BUSY', label: 'Ocupado', color: 'bg-red-500' },
                { value: 'IN_MEETING', label: 'En reunión', color: 'bg-purple-500' }
              ].map(status => (
                <button
                  key={status.value}
                  onClick={() => setMyStatus(status.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                    myStatus === status.value ? 'border-indigo-500 bg-indigo-50' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <span className={`w-3 h-3 ${status.color} rounded-full`} />
                  <span className="font-medium">{status.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Mensaje de estado (opcional)
              </label>
              <input
                type="text"
                value={myStatusMessage}
                onChange={(e) => setMyStatusMessage(e.target.value)}
                placeholder="Ej: Trabajando en el proyecto X..."
                className="w-full px-4 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={updateStatus}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Personalizar Avatar</h3>

            {currentUser && (
              <div className="flex justify-center mb-6">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                  style={{ backgroundColor: myAvatarColor }}
                >
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Color del avatar
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
                  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
                  '#6B7280', '#1F2937'
                ].map(color => (
                  <button
                    key={color}
                    onClick={() => setMyAvatarColor(color)}
                    className={`w-10 h-10 rounded-full transition-transform ${
                      myAvatarColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAvatarModal(false)}
                className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={updateAvatar}
                className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedMember(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-4"
                style={{ backgroundColor: selectedMember.avatarColor }}
              >
                {selectedMember.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">{selectedMember.name}</h3>
              <p className="text-zinc-500">{selectedMember.role}</p>

              <div className="flex items-center justify-center gap-2 mt-3">
                <span className={`w-2 h-2 rounded-full ${
                  selectedMember.officeStatus === 'ONLINE' ? 'bg-emerald-500' :
                  selectedMember.officeStatus === 'AWAY' ? 'bg-amber-500' :
                  selectedMember.officeStatus === 'BUSY' ? 'bg-red-500' :
                  selectedMember.officeStatus === 'IN_MEETING' ? 'bg-purple-500' :
                  'bg-zinc-400'
                }`} />
                <span className="text-sm text-zinc-600">
                  {selectedMember.officeStatus === 'ONLINE' ? 'Disponible' :
                   selectedMember.officeStatus === 'AWAY' ? 'Ausente' :
                   selectedMember.officeStatus === 'BUSY' ? 'Ocupado' :
                   selectedMember.officeStatus === 'IN_MEETING' ? 'En reunión' :
                   'Desconectado'}
                </span>
              </div>

              {selectedMember.statusMessage && (
                <p className="text-sm text-zinc-400 italic mt-2">"{selectedMember.statusMessage}"</p>
              )}

              {selectedMember.id !== currentUserId && selectedMember.officeStatus !== 'OFFLINE' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { handleWave(selectedMember.id); setSelectedMember(null) }}
                    className="flex-1 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors"
                  >
                    👋 Saludar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
