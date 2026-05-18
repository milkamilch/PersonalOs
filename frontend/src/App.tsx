import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Search, Bell, Settings } from 'lucide-react'
import { api } from './api/client'
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

interface ContentResult { type: string; id: number; title: string; sub: string; route: string; icon: string }

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [contentResults, setContentResults] = useState<ContentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const nav = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pageResults = q.trim()
    ? PAGES.filter(p => p.label.toLowerCase().includes(q.toLowerCase()) || p.group.toLowerCase().includes(q.toLowerCase()))
    : PAGES

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setContentResults([]); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/search', { params: { q: q.trim() } })
        setContentResults(res.data)
      } catch { setContentResults([]) }
      finally { setLoading(false) }
    }, 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q])

  const allResults = q.trim().length >= 2
    ? [...contentResults, ...pageResults.map(p => ({ type: 'page', id: 0, title: p.label, sub: p.group || '—', route: p.path, icon: '→' }))]
    : pageResults.map(p => ({ type: 'page', id: 0, title: p.label, sub: p.group || '—', route: p.path, icon: '→' }))

  function go(route: string) { nav(route); onClose() }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 72, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 560, background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', margin: '0 16px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <Search size={15} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setCursor(0) }}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allResults.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
              if (e.key === 'Enter' && allResults.length > 0) go(allResults[cursor].route)
            }}
            placeholder="Suche: Seiten, Todos, Buchungen, Notizen, Kontakte…"
            style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 14.5, color: 'var(--fg)' }} />
          {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
          <kbd style={{ fontSize: 10, color: 'var(--fg-4)', background: 'var(--surface-sunk)', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {q.trim().length >= 2 && contentResults.length > 0 && (
            <>
              <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, color: 'var(--fg-5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Inhalte</div>
              {contentResults.map((r, i) => (
                <button key={`c-${r.type}-${r.id}-${i}`} onClick={() => go(r.route)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 16px', textAlign: 'left', cursor: 'pointer', background: cursor === i ? 'var(--surface-sunk)' : 'transparent', color: 'var(--fg)', border: 'none' }}
                  onMouseEnter={() => setCursor(i)}>
                  <span style={{ fontSize: 15, flexShrink: 0, width: 22, textAlign: 'center' }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--fg-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{r.sub}</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--fg-5)', flexShrink: 0, background: 'var(--surface-sunk)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>{r.type}</span>
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
            </>
          )}
          {q.trim().length >= 2 && contentResults.length === 0 && !loading && (
            <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--fg-4)' }}>Keine Treffer für „{q}"</div>
          )}
          <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 600, color: 'var(--fg-5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Seiten</div>
          {pageResults.map((p, i) => {
            const idx = contentResults.length + i
            return (
              <button key={p.path} onClick={() => go(p.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 16px', textAlign: 'left', cursor: 'pointer', background: cursor === idx ? 'var(--surface-sunk)' : 'transparent', color: 'var(--fg)', border: 'none' }}
                onMouseEnter={() => setCursor(idx)}>
                <span style={{ fontSize: 10, color: 'var(--fg-5)', width: 56, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{p.group || '—'}</span>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.label}</span>
              </button>
            )
          })}
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
          <span className="breadcrumb-group">PersonalOS</span>
          {info.group && (
            <span className="breadcrumb-group" style={{ display: 'contents' }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M4 2.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>{info.group}</span>
            </span>
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
