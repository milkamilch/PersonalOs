export interface Document {
  id: number
  name: string
  filePath: string
  uploadedAt: string
}

export interface Flashcard {
  id: number
  documentId: number
  front: string
  back: string
  easiness: number
  interval: number
  repetitions: number
  nextReview: string | null
  ratedAt: string | null
}

export interface MindMapNode {
  id: string
  label: string
  children?: MindMapNode[]
  cluster?: number
}

export interface Summary {
  id: number
  documentId: number
  content: string
  createdAt: string
}

export interface Project {
  id: number
  name: string
  description: string
  color: string
  createdAt: string
  docCount: number
  todoCount: number
  openTodoCount: number
}

export interface Todo {
  id: number
  projectId: number | null
  text: string
  done: boolean
  createdAt: string
}

export interface Stats {
  todayCount: number
  streak: number
  totalDocs: number
  totalCards: number
  docsWithoutCards: number
  docsWithoutMindmap: number
}

export interface SearchResult {
  documentId: number
  documentName: string
  chunkText: string
  score: number
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct: number
}

export interface GitHubRepo {
  id: number
  fullName: string
  description: string
  stargazersCount: number
  openIssuesCount: number
  htmlUrl: string
  updatedAt: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  state: string
  htmlUrl: string
  createdAt: string
  labels: { name: string; color: string }[]
}

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  description: string
}

export interface ServerStatus {
  reachable: boolean
  host: string
  responseTimeMs: number | null
}
