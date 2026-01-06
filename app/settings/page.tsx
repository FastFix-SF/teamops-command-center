'use client'

import { useEffect, useState } from 'react'

interface Setting {
  id: string
  key: string
  value: string
  description: string | null
  category: string
}

const DEFAULT_SETTINGS = [
  { key: 'bonus_rate_per_hour', value: '25', description: 'Tarifa base de bono por hora facturable ($)', category: 'bonus' },
  { key: 'delivery_score_weight', value: '40', description: 'Puntos máximos por entrega a tiempo (0-40)', category: 'scoring' },
  { key: 'progress_score_weight', value: '40', description: 'Puntos máximos por progreso/rendimiento (0-40)', category: 'scoring' },
  { key: 'improvement_score_weight', value: '20', description: 'Puntos máximos por tendencia de mejora (0-20)', category: 'scoring' },
  { key: 'overdue_penalty', value: '5', description: 'Puntos deducidos por tarea vencida', category: 'penalties' },
  { key: 'missing_checkin_penalty', value: '2', description: 'Puntos deducidos por check-in faltante', category: 'penalties' },
  { key: 'checkin_alert_hours', value: '24', description: 'Horas antes de que se active la alerta de check-in', category: 'alerts' },
  { key: 'due_soon_days', value: '2', description: 'Días de umbral para advertencia de próximo vencimiento', category: 'alerts' },
  { key: 'target_billable_hours', value: '140', description: 'Horas facturables objetivo por mes', category: 'targets' },
  { key: 'target_utilization', value: '80', description: 'Tasa de utilización objetivo (%)', category: 'targets' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadSettings = async () => {
    const res = await fetch('/api/settings')
    const data = await res.json()
    setSettings(data)

    // Initialize edited values
    const values: Record<string, string> = {}
    data.forEach((s: Setting) => { values[s.key] = s.value })
    setEditedValues(values)
  }

  useEffect(() => { loadSettings() }, [])

  const initializeDefaults = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: DEFAULT_SETTINGS })
    })
    loadSettings()
  }

  const handleSave = async () => {
    setSaving(true)
    for (const [key, value] of Object.entries(editedValues)) {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    loadSettings()
  }

  const groupedSettings = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, Setting[]>)

  const categoryLabels: Record<string, string> = {
    bonus: '💰 Configuración de Bonos',
    scoring: '📊 Puntuación de Rendimiento',
    penalties: '⚠️ Penalizaciones',
    alerts: '🔔 Umbrales de Alertas',
    targets: '🎯 Objetivos',
    general: '⚙️ General'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500">Configurar parámetros del sistema y fórmulas de puntuación</p>
        </div>
        <div className="flex gap-3">
          {settings.length === 0 && (
            <button onClick={initializeDefaults} className="btn btn-secondary">
              Inicializar Valores
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : saved ? '✓ ¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {settings.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold mb-2">Sin Configuración</h2>
          <p className="text-gray-500 mb-4">Inicializa la configuración predeterminada para comenzar.</p>
          <button onClick={initializeDefaults} className="btn btn-primary">
            Inicializar Valores
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSettings).map(([category, categorySettings]) => (
            <div key={category} className="card">
              <h2 className="card-header">{categoryLabels[category] || category}</h2>
              <div className="space-y-4">
                {categorySettings.map(setting => (
                  <div key={setting.key} className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="font-medium text-gray-900">
                        {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      {setting.description && (
                        <p className="text-sm text-gray-500">{setting.description}</p>
                      )}
                    </div>
                    <div className="w-32">
                      <input
                        type="text"
                        className="input text-right"
                        value={editedValues[setting.key] || ''}
                        onChange={e => setEditedValues({ ...editedValues, [setting.key]: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Referencia de Fórmulas */}
          <div className="card bg-gray-50">
            <h2 className="card-header">📐 Referencia de Fórmulas</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-bold">Puntuación de Rendimiento (0-100)</h3>
                <code className="block bg-white p-2 rounded mt-1">
                  = puntuación_entrega + puntuación_progreso + puntuación_mejora
                </code>
              </div>
              <div>
                <h3 className="font-bold">Puntuación de Entrega (0-{editedValues.delivery_score_weight || 40})</h3>
                <code className="block bg-white p-2 rounded mt-1">
                  = tasa_a_tiempo × ({editedValues.delivery_score_weight || 40} / 100)
                </code>
              </div>
              <div>
                <h3 className="font-bold">Cálculo de Bono</h3>
                <code className="block bg-white p-2 rounded mt-1">
                  = horas_facturables × ${editedValues.bonus_rate_per_hour || 25} × (1 + puntuación_rendimiento / 100)
                </code>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-blue-700">
                  <strong>Ejemplo:</strong> 40 horas facturables, 80 puntuación = 40 × $25 × 1.80 = <strong>$1,800 bono</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Configuración de Twilio */}
          <div className="card">
            <h2 className="card-header">📱 Configuración SMS (Twilio)</h2>
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <p className="text-yellow-700 text-sm">
                ⚠️ Las notificaciones SMS requieren credenciales de Twilio. Configúralas en tu archivo <code>.env</code>:
              </p>
            </div>
            <div className="space-y-2 font-mono text-sm bg-gray-900 text-green-400 p-4 rounded-lg">
              <p>TWILIO_ACCOUNT_SID=tu_account_sid</p>
              <p>TWILIO_AUTH_TOKEN=tu_auth_token</p>
              <p>TWILIO_PHONE_NUMBER=+1234567890</p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Sin credenciales de Twilio, las notificaciones SMS se registrarán pero no se enviarán.
              Obtén tus credenciales en <a href="https://console.twilio.com" target="_blank" className="text-blue-600 hover:underline">console.twilio.com</a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
