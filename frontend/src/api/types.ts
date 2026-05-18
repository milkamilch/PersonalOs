export interface Project {
  id: number
  name: string
  description: string
  color: string
  createdAt: string
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

export interface GitHubRepo {
  id: number
  fullName: string
  description: string
  stargazersCount: number
  openIssuesCount: number
  htmlUrl: string
  updatedAt: string
  language?: string
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

export interface ServerMetrics {
  host: string
  reachable: boolean
  loadAvg1: number
  loadAvg5: number
  loadAvg15: number
  cpuCores: number
  memTotal: number
  memUsed: number
  memPct: number
  diskTotal: number
  diskUsed: number
  diskPct: number
  uptimeSeconds: number
  containers: ServerContainer[]
}

export interface ServerContainer {
  name: string
  image: string
  status: string
  state: string
  ports?: string
}

export interface GitHubPRSearchResult {
  total_count: number
  items: GitHubPR[]
}

export interface GitHubPR {
  id: number
  number: number
  title: string
  html_url: string
  state: string
  created_at: string
  updated_at: string
  repository_url: string
  pull_request?: { merged_at: string | null; html_url: string }
}

export interface GitHubEvent {
  id: string
  type: string
  repo: { name: string }
  payload: {
    commits?: Array<{ message: string; sha: string }>
    ref?: string
    ref_type?: string
    pull_request?: { title: string; number: number; html_url: string }
    issue?: { title: string; number: number; html_url: string }
    action?: string
  }
  created_at: string
}

// ── Habits ────────────────────────────────────────────────────────────────
export interface Habit {
  id: number
  name: string
  icon: string
  color: string
  sort_order: number
  done_today: number
  total_done: number
}

export interface HabitWeekDay {
  date: string
  done: number
  total: number
}

// ── Finance ───────────────────────────────────────────────────────────────
export interface FinanceCategory {
  id: number
  name: string
  icon: string
  color: string
  budget_monthly: number
  type: 'income' | 'expense'
}

export interface FinanceTransaction {
  id: number
  category_id: number | null
  category_name: string | null
  category_icon: string | null
  category_color: string | null
  amount: number
  description: string
  tx_date: string
  type: 'income' | 'expense'
}

export interface FinanceSummary {
  month: string
  income: number
  expenses: number
  balance: number
  monthlyIncome: number
  byCategory: Array<FinanceCategory & { spent: number }>
}

export interface FinanceRecurring {
  id: number
  name: string
  amount: number
  type: 'income' | 'expense'
  category_id: number | null
  category_name: string | null
  category_icon: string | null
  day_of_month: number
  active: number
}

// ── Fitness ───────────────────────────────────────────────────────────────
export interface WorkoutExercise {
  id: number
  workout_id: number
  name: string
  sets: number
  reps: number
  weight_kg: number
  duration_min: number
}

export interface Workout {
  id: number
  name: string
  notes: string
  workout_date: string
  exercises: WorkoutExercise[]
}

export interface FitnessStats {
  totalWorkouts: number
  thisMonth: number
  thisWeek: number
  lastWorkout: string
}

export interface BodyWeightEntry {
  id: number
  weight_kg: number
  log_date: string
  note: string
  created_at: string
}

// ── Media ─────────────────────────────────────────────────────────────────
export type MediaType   = 'book' | 'movie' | 'series'
export type MediaStatus = 'want' | 'in_progress' | 'done' | 'dropped'

export interface MediaItem {
  id: number
  type: MediaType
  title: string
  creator: string
  author?: string
  status: MediaStatus
  rating: number | null
  notes: string
  finished_at: string | null
  created_at: string
  current_page?: number
  total_pages?: number
}

// ── Goals ─────────────────────────────────────────────────────────────────
export type GoalHorizon = 'week' | 'month' | 'year' | 'life'
export type GoalStatus  = 'active' | 'done' | 'paused'

export interface Goal {
  id: number
  title: string
  description: string
  horizon: GoalHorizon
  status: GoalStatus
  progress: number
  target_date: string | null
  created_at: string
}

// ── Reading ───────────────────────────────────────────────────────────────
export interface ReadingSession {
  id: number
  media_id: number
  book_title: string
  pages_read: number
  minutes: number
  session_date: string
  note: string
  created_at: string
}

export interface ReadingStats {
  todayMin: number
  weekMin: number
  weekPages: number
  yearPages?: number
  streak: number
}

// ── Contacts ──────────────────────────────────────────────────────────────
export interface Contact {
  id: number
  name: string
  email: string
  phone: string
  company: string
  notes: string
  tag: string
  last_contact: string | null
  created_at: string
}

// ── Time Tracking ─────────────────────────────────────────────────────────
export interface TimeEntry {
  id: number
  project: string
  description: string
  started_at: string
  stopped_at: string | null
  duration_s: number | null
  created_at: string
}

export interface TimeSummary {
  todayS: number
  weekS: number
  monthS: number
  byProject: Array<{ project: string; total_s: number; entries: number }>
}

// ── Recurring Todos ───────────────────────────────────────────────────────
export interface RecurringTodo {
  id: number
  text: string
  recurrence: string
  recurrence_label: string
  active: number
  done_today: boolean
  due_today: boolean
  created_at: string
}

// ── Quick Notes ───────────────────────────────────────────────────────────
export type NoteColor = 'default' | 'yellow' | 'green' | 'red' | 'blue'

export interface QuickNote {
  id: number
  title: string
  content: string
  pinned: number
  color: NoteColor
  created_at: string
  updated_at: string
}

// ── Calendar Events ───────────────────────────────────────────────────────
export interface CalendarEvent {
  id: number
  title: string
  event_date: string
  start_time: string | null
  end_time: string | null
  notes: string
  color: string
  created_at: string
}

// ── Journal ───────────────────────────────────────────────────────────────
export interface JournalEntry {
  id: number
  entry_date: string
  mood: number
  content: string
  created_at: string
}
