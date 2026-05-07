import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

export const endpoints = {
  // Documents
  documents: () => api.get('/documents'),
  upload: (form: FormData) => api.post('/ingest', form),
  deleteDoc: (id: number) => api.delete(`/documents/${id}`),

  // Flashcards
  flashcards: (docId: number) => api.get(`/flashcards?documentId=${docId}`),
  rateCard: (id: number, known: boolean) => api.post(`/flashcards/${id}/rate?known=${known}`),
  dueCards: () => api.get('/flashcards/due'),

  // Summaries
  summary: (docId: number) => api.get(`/summaries?documentId=${docId}`),

  // Mind map
  mindmap: (docId: number) => api.get(`/mindmap?documentId=${docId}`),
  mindmapQuiz: (concepts: string[]) => api.post('/mindmap/quiz', concepts),

  // Search
  search: (q: string) => api.get(`/search?q=${encodeURIComponent(q)}`),

  // Stats
  stats: () => api.get('/stats'),

  // Export
  glossary: (docId: number) => api.get(`/export/glossary?documentId=${docId}`, { responseType: 'blob' }),

  // Projects
  projects: () => api.get('/projects'),
  createProject: (p: { name: string; description?: string; color?: string }) =>
    api.post('/projects', null, { params: p }),
  updateProject: (id: number, p: { name: string; description?: string; color?: string }) =>
    api.put(`/projects/${id}`, null, { params: p }),
  deleteProject: (id: number) => api.delete(`/projects/${id}`),
  projectDocs: (id: number) => api.get(`/projects/${id}/documents`),
  addProjectDoc: (id: number, documentId: number) =>
    api.post(`/projects/${id}/documents`, null, { params: { documentId } }),
  removeProjectDoc: (id: number, documentId: number) =>
    api.delete(`/projects/${id}/documents/${documentId}`),
  projectNotes: (id: number) => api.get(`/projects/${id}/notes`),
  saveProjectNotes: (id: number, content: string) =>
    api.post(`/projects/${id}/notes`, content, { headers: { 'Content-Type': 'text/plain' } }),

  // Todos
  todos: (projectId?: number) =>
    api.get('/todos', projectId != null ? { params: { projectId } } : undefined),
  createTodo: (text: string, projectId?: number) =>
    api.post('/todos', null, { params: { text, ...(projectId != null ? { projectId } : {}) } }),
  doneTodo: (id: number, done: boolean) => api.post(`/todos/${id}/done`, null, { params: { done } }),
  deleteTodo: (id: number) => api.delete(`/todos/${id}`),

  // GitHub
  githubRepos: () => api.get('/github/repos'),
  githubIssues: (repo: string) => api.get(`/github/issues?repo=${encodeURIComponent(repo)}`),
  githubPRs: () => api.get('/github/prs'),
  githubActivity: () => api.get('/github/activity'),
  githubCommits: (owner: string, repo: string) => api.get(`/github/repos/${owner}/${repo}/commits`),

  // Server status + metrics
  serverStatus: () => api.get('/server/status'),
  serverMetrics: () => api.get('/server/metrics'),
  serverContainers: () => api.get('/server/containers'),
  containerAction: (name: string, action: 'start' | 'stop' | 'restart') =>
    api.post(`/server/containers/${name}/${action}`),
  containerLogs: (name: string, lines?: number) =>
    api.get(`/server/containers/${name}/logs`, { params: { lines: lines ?? 100 } }),

  // News (RSS proxy)
  news: (feed: 'de' | 'world' | 'bvb' | 'vikings') => api.get(`/news?feed=${feed}`),

  // Study planner
  plans: () => api.get('/planner'),
  createPlan: (documentId: number, examDate: string, totalPages: number) =>
    api.post('/planner', null, { params: { documentId, examDate, totalPages } }),
  deletePlan: (id: number) => api.delete(`/planner/${id}`),
  logStudy: (id: number, pages: number) =>
    api.post(`/planner/${id}/log`, null, { params: { pages } }),
  planHistory: (id: number) => api.get(`/planner/${id}/history`),

  // Audio transcription
  transcribeAudio: (form: FormData) => api.post('/audio/transcribe', form),

  // Habits
  habits: () => api.get('/habits'),
  createHabit: (b: { name: string; icon: string; color: string }) => api.post('/habits', b),
  deleteHabit: (id: number) => api.delete(`/habits/${id}`),
  toggleHabit: (id: number) => api.post(`/habits/${id}/toggle`),
  habitStreak: (id: number) => api.get(`/habits/streak/${id}`),
  habitWeek: () => api.get('/habits/week'),

  // Finance
  financeCategories: () => api.get('/finance/categories'),
  createFinanceCategory: (b: object) => api.post('/finance/categories', b),
  deleteFinanceCategory: (id: number) => api.delete(`/finance/categories/${id}`),
  financeTransactions: (params?: { limit?: number; month?: string }) =>
    api.get('/finance/transactions', { params }),
  createTransaction: (b: object) => api.post('/finance/transactions', b),
  deleteTransaction: (id: number) => api.delete(`/finance/transactions/${id}`),
  financeSummary: (month?: string) => api.get('/finance/summary', { params: month ? { month } : {} }),
  financeSettings: () => api.get('/finance/settings'),
  saveFinanceSettings: (b: Record<string, string>) => api.post('/finance/settings', b),

  // Fitness
  workouts: (limit?: number) => api.get('/fitness/workouts', { params: { limit: limit ?? 30 } }),
  createWorkout: (b: object) => api.post('/fitness/workouts', b),
  addExercise: (workoutId: number, b: object) => api.post(`/fitness/workouts/${workoutId}/exercises`, b),
  deleteWorkout: (id: number) => api.delete(`/fitness/workouts/${id}`),
  fitnessStats: () => api.get('/fitness/stats'),
  weightLog: (days?: number) => api.get('/fitness/weight', { params: { days: days ?? 90 } }),
  logWeight: (b: object) => api.post('/fitness/weight', b),
  deleteWeight: (id: number) => api.delete(`/fitness/weight/${id}`),

  // Media
  mediaItems: (params?: { type?: string; status?: string }) => api.get('/media', { params }),
  createMedia: (b: object) => api.post('/media', b),
  updateMedia: (id: number, b: object) => api.patch(`/media/${id}`, b),
  deleteMedia: (id: number) => api.delete(`/media/${id}`),
  mediaStats: () => api.get('/media/stats'),

  // Goals
  goals: (params?: { horizon?: string; status?: string }) => api.get('/goals', { params }),
  createGoal: (b: object) => api.post('/goals', b),
  updateGoal: (id: number, b: object) => api.patch(`/goals/${id}`, b),
  deleteGoal: (id: number) => api.delete(`/goals/${id}`),

  // Journal
  journalEntries: (limit?: number) => api.get('/journal', { params: { limit: limit ?? 30 } }),
  journalToday: () => api.get('/journal/today'),
  upsertJournal: (b: object) => api.post('/journal', b),
  deleteJournalEntry: (id: number) => api.delete(`/journal/${id}`),
  moodTrend: () => api.get('/journal/mood-trend'),

  // Reading
  readingSessions: (params?: { mediaId?: number; days?: number }) => api.get('/reading/sessions', { params }),
  logReading: (b: object) => api.post('/reading/sessions', b),
  deleteReadingSession: (id: number) => api.delete(`/reading/sessions/${id}`),
  readingStats: () => api.get('/reading/stats'),

  // Contacts
  contacts: (q?: string) => api.get('/contacts', { params: q ? { q } : undefined }),
  createContact: (b: object) => api.post('/contacts', b),
  updateContact: (id: number, b: object) => api.patch(`/contacts/${id}`, b),
  deleteContact: (id: number) => api.delete(`/contacts/${id}`),

  // Time Tracking
  timeEntries: (params?: { days?: number; project?: string }) => api.get('/time', { params }),
  timeRunning: () => api.get('/time/running'),
  timeStart: (b: object) => api.post('/time/start', b),
  timeStop: () => api.post('/time/stop'),
  deleteTimeEntry: (id: number) => api.delete(`/time/${id}`),
  timeSummary: () => api.get('/time/summary'),

  // Recurring Todos
  recurringTodos: () => api.get('/recurring-todos'),
  createRecurringTodo: (b: object) => api.post('/recurring-todos', b),
  deleteRecurringTodo: (id: number) => api.delete(`/recurring-todos/${id}`),
  toggleRecurringTodo: (id: number) => api.post(`/recurring-todos/${id}/toggle`),

  // Quick Notes
  notes: () => api.get('/notes'),
  createNote: (b: object) => api.post('/notes', b),
  updateNote: (id: number, b: object) => api.patch(`/notes/${id}`, b),
  deleteNote: (id: number) => api.delete(`/notes/${id}`),
}
