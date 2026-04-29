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

  // GitHub (proxied)
  githubRepos: () => api.get('/github/repos'),
  githubIssues: (repo: string) => api.get(`/github/issues?repo=${encodeURIComponent(repo)}`),

  // Server status
  serverStatus: () => api.get('/server/status'),

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
}
