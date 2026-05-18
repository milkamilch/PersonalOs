import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Search, Bell, Settings } from 'lucide-react'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import TodosPage from './pages/TodosPage'
import GitHubPage from './pages/GitHubPage'
import ServerPage from './pages/ServerPage'
import HabitsPage from './pages/HabitsPage'
import FinancePage from './pages/FinancePage'
import FitnessPage from './pages/FitnessPage'
import MediaPage from './pages/MediaPage'
import GoalsPage from './pages/GoalsPage'
import JournalPage from './pages/JournalPage'
import FocusPage from './pages/FocusPage'
import CalendarPage from './pages/CalendarPage'
import NotesPage from './pages/NotesPage'
import TimePage from './pages/TimePage'
import ContactsPage from './pages/ContactsPage'
import ReadingPage from './pages/ReadingPage'
import WeeklyPlannerPage from './pages/WeeklyPlannerPage'
import LoginPage from './pages/LoginPage'
import { getApiKey, setApiKey } from './api/client'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

const ROUTE_LABELS: Record<string, { label: string; group: string }> = {
  '/dashboard':    { label: 'Übersicht',     group: '' },
  '/goals':        { label: 'Ziele',         group: 'Leben' },
  '/habits':       { label: 'Gewohnheiten',  group: 'Leben' },
  '/finance':      { label: 'Finanzen',      group: 'Leben' },
  '/fitness':      { label: 'Fitness',       group: 'Leben' },
  '/journal':      { label: 'Journal',       group: 'Leben' },
  '/media':        { label: 'Medien',        group: 'Leben' },
  '/reading':      { label: 'Lesen',         group: 'Leben' },
  '/contacts':     { label: 'Kontakte',      group: 'Leben' },
  '/calendar':     { label: 'Kalender',      group: 'Arbeit' },
  '/planner-week': { label: 'Wochenplaner',  group: 'Arbeit' },
  '/focus':        { label: 'Fokus',         group: 'Arbeit' },
  '/time':         { label: 'Zeiterfassung', group: 'Arbeit' },
  '/notes':        { label: 'Notizen',       group: 'Arbeit' },
  '/todos':        { label: 'Todos',         group: 'Arbeit' },
  '/projects':     { label: 'Projekte',      group: 'Arbeit' },
  '/github':       { label: 'GitHub',        group: 'Arbeit' },
  '/server':       { label: 'Server',        group: 'Arbeit' },
}

const PAGES = Object.entries(ROUTE_LABELS).map(([path, { label, group }]) => ({ path, label, group }))

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const results = q.trim()
    ? PAGES.filter(p => p.label.toLowerCase().includes(q.toLowerCase()) || p.group.toLowerCase().includes(q.toLowerCase()))
    : PAGES
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 72, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', margin: '0 16px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <Search size={15} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'Enter' && results.length > 0) { nav(results[0].path); onClose() }
            }}
            placeholder="Seite suchen…"
            style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 14.5, color: 'var(--fg)' }} />
          <kbd style={{ fontSize: 10, color: 'var(--fg-4)', background: 'var(--surface-sunk)', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {results.map((p, i) => (
            <button key={p.path} onClick={() => { nav(p.path); onClose() }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', background: 'transparent', color: 'var(--fg)', borderTop: i > 0 ? '1px solid var(--line)' : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunk)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: 10, color: 'var(--fg-5)', width: 56, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{p.group || '—'}</span>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'dark')
  const [density, setDensity] = useState(() => document.documentElement.dataset.density ?? 'cozy')
  function applyTheme(t: string) {
    setTheme(t); document.documentElement.dataset.theme = t; localStorage.setItem('pos_theme', t)
  }
  function applyDensity(d: string) {
    setDensity(d); document.documentElement.dataset.density = d; localStorage.setItem('pos_density', d)
  }
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={onClose} />
      <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 50, width: 220, background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Thema</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['light', 'dark'] as const).map(t => (
            <button key={t} onClick={() => applyTheme(t)}
              style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                background: theme === t ? 'var(--accent)' : 'var(--surface-sunk)',
                color: theme === t ? 'white' : 'var(--fg-3)',
                border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--line)'}` }}>
              {t === 'dark' ? '🌙 Dunkel' : '☀️ Hell'}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Dichte</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([{ key: 'compact', label: 'Kompakt' }, { key: 'cozy', label: 'Komfortabel' }] as const).map(d => (
            <button key={d.key} onClick={() => applyDensity(d.key)}
              style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: density === d.key ? 'var(--surface-sunk)' : 'transparent',
                color: density === d.key ? 'var(--fg)' : 'var(--fg-3)',
                border: `1px solid ${density === d.key ? 'var(--line-strong)' : 'var(--line)'}` }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function Topbar() {
  const loc = useLocation()
  const info = ROUTE_LABELS[loc.pathname] ?? { label: loc.pathname.slice(1), group: '' }
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  return (
    <>
      <div className="topbar" style={{ position: 'relative' }}>
        <div className="crumbs">
          <span>PersonalOS</span>
          {info.group && (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M4 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{info.group}</span>
            </>
          )}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M4 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <strong>{info.label}</strong>
        </div>
        <div className="grow" />
        <button className="iconbtn" title="Suche" onClick={() => setShowSearch(true)}><Search size={15} strokeWidth={1.6} /></button>
        <button className="iconbtn" title="Benachrichtigungen"><Bell size={15} strokeWidth={1.6} /></button>
        <button className="iconbtn" title="Einstellungen" onClick={() => setShowSettings(s => !s)}><Settings size={15} strokeWidth={1.6} /></button>
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </div>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <div className="hidden md:block flex-shrink-0" style={{ width: 'var(--sidebar-w)' }}>
        <Sidebar />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          {children}
        </main>
        <div className="block md:hidden flex-shrink-0">
          <MobileNav />
        </div>
      </div>
    </div>
  )
}

function useThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem('pos_theme')
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.dataset.theme = saved ?? preferred
    const density = localStorage.getItem('pos_density') ?? 'cozy'
    document.documentElement.dataset.density = density
    const accent = localStorage.getItem('pos_accent')
    if (accent) document.documentElement.style.setProperty('--accent', accent)
  }, [])
}

export default function App() {
  useThemeInit()
  const [authed, setAuthed] = useState(() => !!getApiKey())

  function handleLogin(key: string) {
    setApiKey(key)
    setAuthed(true)
  }

  if (!authed) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"    element={<DashboardPage />} />
            <Route path="/projects"     element={<ProjectsPage />} />
            <Route path="/todos"        element={<TodosPage />} />
            <Route path="/github"       element={<GitHubPage />} />
            <Route path="/server"       element={<ServerPage />} />
            <Route path="/habits"       element={<HabitsPage />} />
            <Route path="/finance"      element={<FinancePage />} />
            <Route path="/fitness"      element={<FitnessPage />} />
            <Route path="/media"        element={<MediaPage />} />
            <Route path="/goals"        element={<GoalsPage />} />
            <Route path="/journal"      element={<JournalPage />} />
            <Route path="/focus"        element={<FocusPage />} />
            <Route path="/calendar"     element={<CalendarPage />} />
            <Route path="/notes"        element={<NotesPage />} />
            <Route path="/time"         element={<TimePage />} />
            <Route path="/contacts"     element={<ContactsPage />} />
            <Route path="/reading"      element={<ReadingPage />} />
            <Route path="/planner-week" element={<WeeklyPlannerPage />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
