'use client'

import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Jarvis from '@/components/Jarvis'

const navItems = [
  { href: '/', label: 'Inicio', icon: '◉' },
  { href: '/office', label: 'Oficina', icon: '◐' },
  { href: '/tasks', label: 'Tareas', icon: '◎' },
  { href: '/checkins', label: 'Check-ins', icon: '◈' },
  { href: '/meetings', label: 'Reuniones', icon: '◇' },
  { href: '/time', label: 'Tiempo', icon: '◌' },
  { href: '/leaderboard', label: 'Ranking', icon: '◆' },
  { href: '/team', label: 'Equipo', icon: '◍' },
]

const secondaryNav = [
  { href: '/notifications', label: 'Alertas', icon: '○' },
  { href: '/settings', label: 'Ajustes', icon: '◔' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <title>TeamOps</title>
      </head>
      <body>
        <div className="flex min-h-screen">
          {/* Elegant Minimal Sidebar */}
          <aside className="sidebar">
            {/* Brand */}
            <div className="sidebar-brand">
              <h1>
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">T</span>
                TeamOps
              </h1>
              <p>Gestión Inteligente</p>
            </div>

            {/* Main Navigation */}
            <nav className="sidebar-nav">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                >
                  <span className="opacity-60">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Divider */}
            <div className="my-6 border-t border-zinc-100" />

            {/* Secondary Navigation */}
            <nav className="sidebar-nav">
              {secondaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                >
                  <span className="opacity-60">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer mt-auto">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700">Sistema Activo</p>
                  <p className="text-xs text-zinc-400">JARVIS conectado</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-auto bg-zinc-50">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>

          {/* JARVIS AI Assistant */}
          <Jarvis />
        </div>
      </body>
    </html>
  )
}
