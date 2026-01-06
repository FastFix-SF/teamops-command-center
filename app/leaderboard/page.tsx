'use client'

import { useEffect, useState } from 'react'

interface Report {
  id: string
  month: string
  memberId: string
  member: { id: string; name: string; role: string }
  totalHours: number
  billableHours: number
  valueGenerated: number
  tasksCompleted: number
  onTimeRate: number
  deliveryScore: number
  progressScore: number
  improvementScore: number
  performanceScore: number
  bonusAmount: number
  rank: number | null
}

export default function LeaderboardPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [currentMonth] = useState(new Date().toISOString().slice(0, 7))

  const loadReports = () => {
    fetch(`/api/reports?month=${currentMonth}`)
      .then(r => r.json())
      .then(setReports)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadReports()
  }, [])

  const generateReports = async () => {
    setGenerating(true)
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth, sendNotifications: true })
    })
    loadReports()
    setGenerating(false)
  }

  const notifyLeaderboard = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sendToAll: true,
        type: 'LEADERBOARD',
        message: `🏆 ¡Actualización de Clasificación! Revisa tu posición y puntuación de rendimiento para ${currentMonth}. ¡Sigue empujando por ese primer lugar!`
      })
    })
    alert('¡Notificaciones de clasificación enviadas!')
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', bg: 'bg-yellow-100 border-yellow-400', text: 'text-yellow-700' }
    if (rank === 2) return { emoji: '🥈', bg: 'bg-gray-100 border-gray-400', text: 'text-gray-700' }
    if (rank === 3) return { emoji: '🥉', bg: 'bg-orange-100 border-orange-400', text: 'text-orange-700' }
    return { emoji: `#${rank}`, bg: 'bg-white border-gray-200', text: 'text-gray-600' }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏆 Clasificación</h1>
          <p className="text-gray-500">Rankings de rendimiento para {new Date(currentMonth + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateReports}
            disabled={generating}
            className="btn btn-primary"
          >
            {generating ? 'Generando...' : '📊 Generar Reportes'}
          </button>
          <button onClick={notifyLeaderboard} className="btn btn-secondary">
            📱 Notificar Equipo
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2">Sin Datos de Rendimiento Aún</h2>
          <p className="text-gray-500 mb-4">Genera reportes mensuales para ver la clasificación.</p>
          <button onClick={generateReports} className="btn btn-primary">
            Generar Reportes Ahora
          </button>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 0, 2].map((idx) => {
              const report = reports[idx]
              if (!report) return <div key={idx} />

              const badge = getRankBadge(report.rank || idx + 1)
              const isFirst = idx === 0

              return (
                <div
                  key={report.id}
                  className={`card text-center ${badge.bg} border-2 ${isFirst ? 'transform scale-105 shadow-lg' : ''}`}
                  style={{ order: idx === 1 ? 0 : idx === 0 ? 1 : 2 }}
                >
                  <div className="text-5xl mb-2">{badge.emoji}</div>
                  <h3 className="font-bold text-xl">{report.member.name}</h3>
                  <p className="text-sm text-gray-500">{report.member.role}</p>
                  <div className={`text-4xl font-bold ${badge.text} my-4`}>
                    {report.performanceScore.toFixed(0)}
                  </div>
                  <p className="text-sm text-gray-500">Puntuación de Rendimiento</p>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-2xl font-bold text-green-600">${report.bonusAmount.toFixed(0)}</div>
                    <p className="text-xs text-gray-500">Bono Proyectado</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Full Rankings Table */}
          <div className="card">
            <h2 className="card-header">Rankings Completos</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Posición</th>
                  <th>Miembro</th>
                  <th>Horas Totales</th>
                  <th>Facturables</th>
                  <th>Tareas Completadas</th>
                  <th>% a Tiempo</th>
                  <th>Entrega</th>
                  <th>Progreso</th>
                  <th>Mejora</th>
                  <th>Puntuación Total</th>
                  <th>Bono</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const badge = getRankBadge(report.rank || 0)
                  return (
                    <tr key={report.id} className={report.rank && report.rank <= 3 ? badge.bg : ''}>
                      <td>
                        <span className="text-xl">{badge.emoji}</span>
                      </td>
                      <td>
                        <div className="font-medium">{report.member.name}</div>
                        <div className="text-xs text-gray-500">{report.member.role}</div>
                      </td>
                      <td>{report.totalHours.toFixed(1)}h</td>
                      <td className="text-green-600 font-medium">{report.billableHours.toFixed(1)}h</td>
                      <td>{report.tasksCompleted}</td>
                      <td>
                        <span className={report.onTimeRate >= 80 ? 'text-green-600' : report.onTimeRate >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                          {report.onTimeRate.toFixed(0)}%
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded">
                            <div className="h-full bg-blue-500 rounded" style={{ width: `${(report.deliveryScore / 40) * 100}%` }} />
                          </div>
                          <span className="text-xs">{report.deliveryScore.toFixed(0)}/40</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded">
                            <div className="h-full bg-green-500 rounded" style={{ width: `${(report.progressScore / 40) * 100}%` }} />
                          </div>
                          <span className="text-xs">{report.progressScore.toFixed(0)}/40</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded">
                            <div className="h-full bg-purple-500 rounded" style={{ width: `${(report.improvementScore / 20) * 100}%` }} />
                          </div>
                          <span className="text-xs">{report.improvementScore.toFixed(0)}/20</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-xl font-bold">{report.performanceScore.toFixed(0)}</span>
                      </td>
                      <td>
                        <span className="text-green-600 font-bold">${report.bonusAmount.toFixed(0)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Scoring Formula */}
          <div className="card bg-gray-50">
            <h2 className="card-header">📐 Fórmula de Puntuación</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-2">Puntuación de Rendimiento (0-100)</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-24 text-blue-600 font-medium">Entrega</span>
                    <span className="text-gray-500">(0-40)</span>
                    <span>= % a Tiempo × 0.4</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-24 text-green-600 font-medium">Progreso</span>
                    <span className="text-gray-500">(0-40)</span>
                    <span>= Tareas × 5 + P0/P1 × 5 + Horas / 4</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-24 text-purple-600 font-medium">Mejora</span>
                    <span className="text-gray-500">(0-20)</span>
                    <span>= Tendencia mes a mes</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-2">Fórmula de Bono</h3>
                <div className="bg-white p-4 rounded-lg border font-mono text-sm">
                  <p>bono = horas_facturables × $25 × (1 + puntuación/100)</p>
                  <p className="mt-2 text-gray-500">Ejemplo: 40h × $25 × 1.80 = $1,800</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
