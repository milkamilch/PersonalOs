import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

export default function App() {
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
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <main className="flex-1 min-w-0 overflow-y-auto md:pb-0" style={{ background: 'var(--bg-base)' }}>
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
            </main>
            <div className="block md:hidden flex-shrink-0">
              <MobileNav />
            </div>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
