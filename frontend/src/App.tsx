import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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

function Topbar() {
  const loc = useLocation()
  const info = ROUTE_LABELS[loc.pathname] ?? { label: loc.pathname.slice(1), group: '' }
  return (
    <div className="topbar">
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
      <button className="iconbtn" title="Suche"><Search size={15} strokeWidth={1.6} /></button>
      <button className="iconbtn" title="Benachrichtigungen"><Bell size={15} strokeWidth={1.6} /></button>
      <button className="iconbtn" title="Einstellungen"><Settings size={15} strokeWidth={1.6} /></button>
    </div>
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
