import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sidebar from './components/Sidebar'
import ProjectsPage from './pages/ProjectsPage'
import StudyPage from './pages/StudyPage'
import FlashcardsPage from './pages/FlashcardsPage'
import MindMapPage from './pages/MindMapPage'
import SearchPage from './pages/SearchPage'
import DashboardPage from './pages/DashboardPage'
import TodosPage from './pages/TodosPage'
import GitHubPage from './pages/GitHubPage'
import ServerPage from './pages/ServerPage'
import JArvisPage from './pages/JArvisPage'
import ExamPage from './pages/ExamPage'
import PlannerPage from './pages/PlannerPage'
import AudioPage from './pages/AudioPage'
import PdfViewerPage from './pages/PdfViewerPage'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-y-auto">
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
              <Route path="/jarvis" element={<JArvisPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/audio" element={<AudioPage />} />
              <Route path="/pdf" element={<PdfViewerPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
