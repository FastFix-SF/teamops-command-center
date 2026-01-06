'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardData {
  stats: {
    totalTasks: number
    activeTasks: number
    completedTasks: number
    overdueTasks: number
    blockedTasks: number
    hoursThisMonth: number
    billableHoursThisMonth: number
  }
  overdueTasksList: Array<{ id: string; title: string; priority: string; owner: { name: string }; dueDate: string }>
  dueSoonTasks: Array<{ id: string; title: string; priority: string; dueDate: string }>
  blockedTasksList: Array<{ id: string; title: string; owner: { name: string }; blockerNotes: string }>
  currentFocus: Array<{ id: string; title: string; progressPercent: number; owner: { name: string } }>
  recentlyCompleted: Array<{ id: string; title: string; owner: { name: string } }>
  leaderboard: Array<{ id: string; member: { name: string }; performanceScore: number; billableHours: number; bonusAmount: number }>
}

interface OfficeData {
  members: Array<{
    id: string
    name: string
    officeStatus: string
    statusMessage?: string
    avatarColor: string
  }>
  stats: {
    online: number
    away: number
    busy: number
    inMeeting: number
    offline: number
  }
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [officeData, setOfficeData] = useState<OfficeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Buenos días')
    else if (hour < 18) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')

    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)

    // Fetch dashboard data
    Promise.all([
      fetch('/api/dashboard').then(res => res.json()),
      fetch('/api/office').then(res => res.json()).catch(() => null)
    ])
      .then(([dashData, offData]) => {
        setData(dashData)
        setOfficeData(offData)
      })
      .finally(() => setLoading(false))

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  if (loading) {
    return (
      <div className="smart-display">
        <div className="smart-display-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="widget widget-skeleton" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="smart-display flex items-center justify-center">
        <div className="widget widget-lg text-center">
          <div className="text-6xl mb-4 opacity-50">⚠️</div>
          <p className="text-zinc-400 text-lg">Error al cargar</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary mt-6">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const onlineTeam = officeData?.members?.filter(m => m.officeStatus !== 'OFFLINE') || []
  const totalOnline = officeData?.stats ?
    officeData.stats.online + officeData.stats.away + officeData.stats.busy + officeData.stats.inMeeting : 0

  return (
    <div className="smart-display animate-fade-in">
      {/* Time & Greeting - Hero Widget */}
      <div className="widget widget-hero widget-glass">
        <div className="widget-hero-content">
          <div className="widget-time">{formatTime(currentTime)}</div>
          <div className="widget-date">{formatDate(currentTime)}</div>
          <div className="widget-greeting">{greeting}</div>
        </div>
        <div className="widget-hero-decoration">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="smart-display-grid">

        {/* Quick Actions Widget */}
        <div className="widget widget-actions">
          <div className="widget-header">
            <span className="widget-icon">⚡</span>
            <span>Acciones Rápidas</span>
          </div>
          <div className="action-grid">
            <Link href="/checkins" className="action-btn action-checkin">
              <span className="action-icon">🎤</span>
              <span className="action-label">Check-in</span>
            </Link>
            <Link href="/tasks" className="action-btn action-tasks">
              <span className="action-icon">✅</span>
              <span className="action-label">Tareas</span>
            </Link>
            <Link href="/office" className="action-btn action-office">
              <span className="action-icon">🏢</span>
              <span className="action-label">Oficina</span>
            </Link>
            <Link href="/time" className="action-btn action-time">
              <span className="action-icon">⏱️</span>
              <span className="action-label">Tiempo</span>
            </Link>
          </div>
        </div>

        {/* Stats Overview Widget */}
        <div className="widget widget-stats">
          <div className="widget-header">
            <span className="widget-icon">📊</span>
            <span>Resumen</span>
          </div>
          <div className="stats-ring-container">
            <div className="stats-ring">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="stats-ring-bg" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stats-ring-fill"
                  strokeDasharray={`${(data.stats.completedTasks / Math.max(data.stats.totalTasks, 1)) * 251.2} 251.2`}
                />
              </svg>
              <div className="stats-ring-center">
                <span className="stats-ring-value">{data.stats.completedTasks}</span>
                <span className="stats-ring-label">de {data.stats.totalTasks}</span>
              </div>
            </div>
            <div className="stats-mini-grid">
              <div className="stats-mini">
                <span className="stats-mini-value text-indigo-500">{data.stats.activeTasks}</span>
                <span className="stats-mini-label">Activas</span>
              </div>
              <div className="stats-mini">
                <span className="stats-mini-value text-amber-500">{data.stats.overdueTasks}</span>
                <span className="stats-mini-label">Vencidas</span>
              </div>
              <div className="stats-mini">
                <span className="stats-mini-value text-purple-500">{data.stats.blockedTasks}</span>
                <span className="stats-mini-label">Bloqueadas</span>
              </div>
              <div className="stats-mini">
                <span className="stats-mini-value text-emerald-500">{data.stats.billableHoursThisMonth.toFixed(0)}h</span>
                <span className="stats-mini-label">Facturables</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Presence Widget */}
        <Link href="/office" className="widget widget-team">
          <div className="widget-header">
            <span className="widget-icon">👥</span>
            <span>Equipo en Oficina</span>
            <span className="widget-badge">{totalOnline} online</span>
          </div>
          <div className="team-presence">
            <div className="team-avatars">
              {onlineTeam.slice(0, 5).map((member, i) => (
                <div
                  key={member.id}
                  className="team-avatar"
                  style={{
                    backgroundColor: member.avatarColor,
                    zIndex: 10 - i,
                    marginLeft: i > 0 ? '-12px' : '0'
                  }}
                >
                  {member.name.charAt(0)}
                  <span className={`presence-dot presence-${member.officeStatus.toLowerCase()}`} />
                </div>
              ))}
              {onlineTeam.length > 5 && (
                <div className="team-avatar team-avatar-more" style={{ marginLeft: '-12px' }}>
                  +{onlineTeam.length - 5}
                </div>
              )}
            </div>
            {onlineTeam.length === 0 ? (
              <p className="team-status-text">Nadie conectado ahora</p>
            ) : (
              <p className="team-status-text">
                {onlineTeam.slice(0, 2).map(m => m.name.split(' ')[0]).join(', ')}
                {onlineTeam.length > 2 && ` y ${onlineTeam.length - 2} más`}
              </p>
            )}
          </div>
          <div className="widget-cta">
            <span>Ir a la oficina</span>
            <span className="widget-cta-arrow">→</span>
          </div>
        </Link>

        {/* Alerts Widget */}
        {(data.overdueTasksList.length > 0 || data.blockedTasksList.length > 0) ? (
          <div className="widget widget-alerts">
            <div className="widget-header">
              <span className="widget-icon widget-icon-pulse">🔔</span>
              <span>Requiere Atención</span>
            </div>
            <div className="alerts-list">
              {data.overdueTasksList.slice(0, 2).map((task) => (
                <div key={task.id} className="alert-item alert-overdue">
                  <span className="alert-indicator" />
                  <div className="alert-content">
                    <p className="alert-title">{task.title}</p>
                    <p className="alert-subtitle">{task.owner.name} · Vencida</p>
                  </div>
                  <span className={`alert-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                </div>
              ))}
              {data.blockedTasksList.slice(0, 2).map((task) => (
                <div key={task.id} className="alert-item alert-blocked">
                  <span className="alert-indicator alert-indicator-purple" />
                  <div className="alert-content">
                    <p className="alert-title">{task.title}</p>
                    <p className="alert-subtitle">{task.owner.name} · Bloqueada</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/tasks" className="widget-cta">
              <span>Ver todas las tareas</span>
              <span className="widget-cta-arrow">→</span>
            </Link>
          </div>
        ) : (
          <div className="widget widget-success">
            <div className="success-content">
              <div className="success-icon">✨</div>
              <div>
                <h3 className="success-title">Todo en orden</h3>
                <p className="success-text">No hay tareas urgentes pendientes</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Focus Widget */}
        <div className="widget widget-focus">
          <div className="widget-header">
            <span className="widget-icon">🎯</span>
            <span>En Progreso</span>
          </div>
          {data.currentFocus.length === 0 ? (
            <div className="widget-empty">
              <span className="widget-empty-icon">🎯</span>
              <span>Sin tareas en enfoque</span>
            </div>
          ) : (
            <div className="focus-list">
              {data.currentFocus.slice(0, 3).map((task) => (
                <div key={task.id} className="focus-item">
                  <div className="focus-avatar" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                    {task.owner.name.charAt(0)}
                  </div>
                  <div className="focus-details">
                    <p className="focus-title">{task.title}</p>
                    <div className="focus-progress">
                      <div className="focus-progress-bar">
                        <div
                          className="focus-progress-fill"
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      </div>
                      <span className="focus-progress-text">{task.progressPercent}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard Widget */}
        <Link href="/leaderboard" className="widget widget-leaderboard">
          <div className="widget-header">
            <span className="widget-icon">🏆</span>
            <span>Top Rendimiento</span>
          </div>
          {data.leaderboard.length === 0 ? (
            <div className="widget-empty">
              <span className="widget-empty-icon">🏆</span>
              <span>Sin datos aún</span>
            </div>
          ) : (
            <div className="leaderboard-list">
              {data.leaderboard.slice(0, 3).map((report, i) => (
                <div key={report.id} className={`leaderboard-item leaderboard-rank-${i + 1}`}>
                  <div className="leaderboard-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="leaderboard-info">
                    <p className="leaderboard-name">{report.member.name}</p>
                    <p className="leaderboard-hours">{report.billableHours.toFixed(1)}h facturables</p>
                  </div>
                  <div className="leaderboard-score">
                    <span className="leaderboard-score-value">{report.performanceScore.toFixed(0)}</span>
                    <span className="leaderboard-score-label">pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="widget-cta">
            <span>Ver ranking completo</span>
            <span className="widget-cta-arrow">→</span>
          </div>
        </Link>

        {/* Hours This Month Widget */}
        <div className="widget widget-hours">
          <div className="widget-header">
            <span className="widget-icon">⏰</span>
            <span>Horas Este Mes</span>
          </div>
          <div className="hours-display">
            <div className="hours-value">
              <span className="hours-number">{data.stats.hoursThisMonth.toFixed(0)}</span>
              <span className="hours-unit">horas</span>
            </div>
            <div className="hours-breakdown">
              <div className="hours-bar">
                <div
                  className="hours-bar-fill hours-billable"
                  style={{ width: `${(data.stats.billableHoursThisMonth / Math.max(data.stats.hoursThisMonth, 1)) * 100}%` }}
                />
              </div>
              <div className="hours-legend">
                <span className="hours-legend-item">
                  <span className="hours-legend-dot billable" />
                  {data.stats.billableHoursThisMonth.toFixed(0)}h facturables
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* JARVIS Widget */}
        <div className="widget widget-jarvis">
          <div className="jarvis-glow" />
          <div className="jarvis-content">
            <div className="jarvis-avatar">
              <div className="jarvis-ring" />
              <span className="jarvis-icon">🤖</span>
            </div>
            <div className="jarvis-info">
              <h3 className="jarvis-title">JARVIS Activo</h3>
              <p className="jarvis-subtitle">Tu asistente de voz está listo</p>
            </div>
          </div>
          <p className="jarvis-hint">
            Haz clic en el botón flotante para hacer check-ins de voz o consultas
          </p>
        </div>
      </div>
    </div>
  )
}
