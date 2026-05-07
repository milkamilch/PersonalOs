import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import ProjectsPage from './pages/ProjectsPage'
import StudyPage from './pages/StudyPage'
import FlashcardsPage from './pages/FlashcardsPage'
import MindMapPage from './pages/MindMapPage'
import SearchPage from './pages/SearchPage'
import DashboardPage from './pages/DashboardPage'
import TodosPage from './pages/TodosPage'
import GitHubPage from './pages/GitHubPage'
import ServerPage from './pages/ServerPage'
import ExamPage from './pages/ExamPage'
import PlannerPage from './pages/PlannerPage'
import AudioPage from './pages/AudioPage'
import PdfViewerPage from './pages/PdfViewerPage'
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

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
          {/* Sidebar: only on md+ */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <main className="flex-1 min-w-0 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/study" element={<StudyPage />} />
                <Route path="/flashcards" element={<FlashcardsPage />} />
                <Route path="/mindmap" element={<MindMapPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/exam" element={<ExamPage />} />
                <Route path="/todos" element={<TodosPage />} />
                <Route path="/github" element={<GitHubPage />} />
                <Route path="/server" element={<ServerPage />} />
                <Route path="/planner" element={<PlannerPage />} />
                <Route path="/audio" element={<AudioPage />} />
                <Route path="/pdf" element={<PdfViewerPage />} />
                <Route path="/habits" element={<HabitsPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/fitness" element={<FitnessPage />} />
                <Route path="/media" element={<MediaPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/journal" element={<JournalPage />} />
                <Route path="/focus" element={<FocusPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/time" element={<TimePage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/reading" element={<ReadingPage />} />
                <Route path="/planner-week" element={<WeeklyPlannerPage />} />
              </Routes>
            </main>
            {/* Bottom nav: only on mobile */}
            <div className="block md:hidden flex-shrink-0">
              <MobileNav />
            </div>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
