'use client'

import { useEffect, useState } from 'react'

interface Member {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  timezone: string
  checkinFrequency: string
  isActive: boolean
  hourlyRate: number
  notifyOnOverdue: boolean
  notifyOnMeeting: boolean
  notifyOnMention: boolean
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: '', timezone: 'EST',
    checkinFrequency: 'DAILY', isActive: true, hourlyRate: 100,
    notifyOnOverdue: true, notifyOnMeeting: true, notifyOnMention: true
  })

  const loadMembers = () => {
    fetch('/api/members').then(r => r.json()).then(setMembers)
  }

  useEffect(() => { loadMembers() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editingMember ? 'PUT' : 'POST'
    const body = editingMember ? { id: editingMember.id, ...formData } : formData

    await fetch('/api/members', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    setShowModal(false)
    setEditingMember(null)
    setFormData({
      name: '', email: '', phone: '', role: '', timezone: 'EST',
      checkinFrequency: 'DAILY', isActive: true, hourlyRate: 100,
      notifyOnOverdue: true, notifyOnMeeting: true, notifyOnMention: true
    })
    loadMembers()
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      timezone: member.timezone,
      checkinFrequency: member.checkinFrequency,
      isActive: member.isActive,
      hourlyRate: member.hourlyRate,
      notifyOnOverdue: member.notifyOnOverdue,
      notifyOnMeeting: member.notifyOnMeeting,
      notifyOnMention: member.notifyOnMention
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este miembro? Esto también eliminará sus tareas y registros de tiempo.')) return
    await fetch('/api/members', { method: 'DELETE', body: JSON.stringify({ id }) })
    loadMembers()
  }

  const toggleActive = async (member: Member) => {
    await fetch('/api/members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, isActive: !member.isActive })
    })
    loadMembers()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipo</h1>
          <p className="text-gray-500">Gestionar miembros del equipo y preferencias de notificación</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Agregar Miembro
        </button>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(member => (
          <div key={member.id} className={`card ${!member.isActive ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{member.name}</h3>
                <p className="text-gray-500">{member.role}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {member.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📧</span>
                <span>{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">📱</span>
                  <span>{member.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-400">🌍</span>
                <span>{member.timezone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">💰</span>
                <span>${member.hourlyRate}/hr</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">⏰</span>
                <span>Check-ins {member.checkinFrequency === 'HOURLY' ? 'cada hora' : 'diarios'}</span>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-2">Notificaciones SMS:</p>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs ${member.notifyOnOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                  Vencidas
                </span>
                <span className={`px-2 py-1 rounded text-xs ${member.notifyOnMeeting ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                  Reuniones
                </span>
                <span className={`px-2 py-1 rounded text-xs ${member.notifyOnMention ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                  Menciones
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button onClick={() => handleEdit(member)} className="btn btn-secondary flex-1 text-sm">
                Editar
              </button>
              <button onClick={() => toggleActive(member)} className={`btn text-sm ${member.isActive ? 'btn-secondary' : 'btn-success'}`}>
                {member.isActive ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => handleDelete(member.id)} className="btn btn-danger text-sm">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{editingMember ? 'Editar Miembro' : 'Agregar Miembro'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Rol *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    required
                    placeholder="ej., Líder de Proyecto, Analista"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Correo *</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Teléfono (para SMS)</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Zona Horaria</label>
                  <select
                    className="input"
                    value={formData.timezone}
                    onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                  >
                    <option value="EST">EST (UTC-5)</option>
                    <option value="CST">CST (UTC-6)</option>
                    <option value="MST">MST (UTC-7)</option>
                    <option value="PST">PST (UTC-8)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="label">Frecuencia de Check-in</label>
                  <select
                    className="input"
                    value={formData.checkinFrequency}
                    onChange={e => setFormData({ ...formData, checkinFrequency: e.target.value })}
                  >
                    <option value="DAILY">Diario</option>
                    <option value="HOURLY">Cada hora</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tarifa por Hora ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={formData.hourlyRate}
                    onChange={e => setFormData({ ...formData, hourlyRate: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Preferencias de Notificación SMS</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notifyOnOverdue}
                      onChange={e => setFormData({ ...formData, notifyOnOverdue: e.target.checked })}
                    />
                    Alertas de vencidas
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notifyOnMeeting}
                      onChange={e => setFormData({ ...formData, notifyOnMeeting: e.target.checked })}
                    />
                    Recordatorios de reuniones
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notifyOnMention}
                      onChange={e => setFormData({ ...formData, notifyOnMention: e.target.checked })}
                    />
                    Menciones
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActive">Miembro activo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingMember ? 'Actualizar Miembro' : 'Agregar Miembro'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setEditingMember(null) }} className="btn btn-secondary">
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
