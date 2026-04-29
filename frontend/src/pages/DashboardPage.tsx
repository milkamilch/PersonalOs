import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wifi, WifiOff, Clock, Flame, Brain, FileText,
  CheckSquare, GitBranch, AlertCircle, ExternalLink,
  Plus, Trash2, Send, Star, Newspaper, Globe, Flag, Trophy
} from 'lucide-react'
import { endpoints } from '../api/client'
import type { ServerStatus, Stats, Todo, NewsItem, GitHubRepo } from '../api/types'
import { api } from '../api/client'
import JArvisOrb from '../components/JArvisOrb'

// ── Glass card ────────────────────────────────────────────────────────────
function Glass({
  children, className = '', style = {},
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function WidgetHeader({
  icon: Icon, title, color = '#818cf8', right,
}: { icon: React.ElementType; title: string; color?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color }} />
        <span className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.4)' }}>{title}</span>
      </div>
      {right}
    </div>
  )
}

// ── Server ────────────────────────────────────────────────────────────────
function ServerWidget() {
  const { data: status, isLoading, error } = useQuery<ServerStatus>({
    queryKey: ['serverStatus'],
    queryFn: () => endpoints.serverStatus().then(r => r.data),
    refetchInterval: 30_000,
    retry: false,
  })

  return (
    <Glass className="h-full">
      <WidgetHeader icon={Wifi} title="Server" color="#34d399" />
      <div className="flex-1 flex flex-col justify-center px-4 py-3">
        {isLoading && <Spinner />}
        {error && <Muted>SERVER_HOST nicht konfiguriert</Muted>}
        {status && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: status.reachable ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }}>
                {status.reachable
                  ? <Wifi size={16} style={{ color: '#34d399' }} />
                  : <WifiOff size={16} style={{ color: '#f87171' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{status.host}</p>
                <p className="text-xs" style={{ color: status.reachable ? '#34d399' : '#f87171' }}>
                  {status.reachable ? 'Online' : 'Offline'}
                </p>
              </div>
              {status.reachable && status.responseTimeMs != null && (
                <div className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <Clock size={10} />{status.responseTimeMs}ms
                </div>
              )}
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{
                     width: status.reachable ? '100%' : '20%',
                     background: status.reachable
                       ? 'linear-gradient(90deg, #34d399, #10b981)'
                       : '#f87171',
                   }} />
            </div>
          </div>
        )}
      </div>
    </Glass>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────
function StatsWidget() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => endpoints.stats().then(r => r.data),
  })

  const items = stats ? [
    { label: 'Streak', value: `${stats.streak}d`, color: '#fb923c', Icon: Flame },
    { label: 'Heute', value: stats.todayCount, color: '#a78bfa', Icon: Brain },
    { label: 'Dokumente', value: stats.totalDocs, color: '#60a5fa', Icon: FileText },
    { label: 'Karten', value: stats.totalCards, color: '#34d399', Icon: CheckSquare },
  ] : []

  return (
    <Glass className="h-full">
      <WidgetHeader icon={Brain} title="Lernstats" color="#a78bfa" />
      <div className="flex-1 grid grid-cols-2 gap-px p-0.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {items.map(({ label, value, color, Icon: I }) => (
          <div key={label} className="flex flex-col justify-center px-4 py-3"
               style={{ background: '#080b14' }}>
            <I size={14} style={{ color, marginBottom: 4 }} />
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
          </div>
        ))}
        {!stats && <div className="col-span-2 flex items-center justify-center"><Spinner /></div>}
      </div>
    </Glass>
  )
}

// ── Todos ─────────────────────────────────────────────────────────────────
function TodosWidget() {
  const qc = useQueryClient()
  const [text, setText] = useState('')

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: () => endpoints.todos().then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => endpoints.createTodo(text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); setText('') },
  })
  const done = useMutation({
    mutationFn: ({ id, d }: { id: number; d: boolean }) => endpoints.doneTodo(id, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })

  const open = todos.filter(t => !t.done)

  return (
    <Glass className="h-full">
      <WidgetHeader
        icon={CheckSquare}
        title={`Todos · ${open.length} offen`}
        color="#60a5fa"
      />
      <div className="flex-1 flex flex-col min-h-0 p-3">
        <div className="flex gap-2 mb-2 flex-shrink-0">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && text && create.mutate()}
            placeholder="Neue Aufgabe…"
            className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f6fc',
            }}
          />
          <button
            onClick={() => text && create.mutate()}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity"
            style={{ background: 'rgba(124,58,237,0.4)', color: '#c4b5fd' }}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {open.length === 0 && (
            <p className="text-xs text-center py-3" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Alles erledigt 🎉
            </p>
          )}
          {open.slice(0, 6).map(t => (
            <div key={t.id}
                 className="flex items-center gap-2 px-2 py-1.5 rounded-lg group transition-colors"
                 style={{ background: 'rgba(255,255,255,0.02)' }}>
              <button
                onClick={() => done.mutate({ id: t.id, d: true })}
                className="w-4 h-4 rounded border flex-shrink-0 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.15)' }}
              />
              <span className="flex-1 text-xs truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {t.text}
              </span>
              <button
                onClick={() => del.mutate(t.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'rgba(248,113,113,0.6)' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Glass>
  )
}

// ── GitHub ────────────────────────────────────────────────────────────────
function GitHubWidget() {
  const { data: repos = [], error } = useQuery<GitHubRepo[]>({
    queryKey: ['githubRepos'],
    queryFn: () => endpoints.githubRepos().then(r => r.data),
    retry: false,
  })

  return (
    <Glass className="h-full">
      <WidgetHeader icon={GitBranch} title="GitHub" color="#f0f6fc" />
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {error && <Muted>GITHUB_TOKEN nicht konfiguriert</Muted>}
        {!error && repos.length === 0 && <div className="flex justify-center pt-4"><Spinner /></div>}
        {repos.slice(0, 7).map((r: any) => (
          <a
            key={r.id ?? r.full_name}
            href={r.html_url ?? r.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-2 rounded-xl group transition-colors"
            style={{ color: 'inherit', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <GitBranch size={12} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <span className="flex-1 text-xs truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {r.name ?? (r.full_name ?? '').split('/')[1]}
            </span>
            {(r.open_issues_count ?? r.openIssuesCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-xs flex-shrink-0"
                    style={{ color: '#fbbf24' }}>
                <AlertCircle size={10} />
                {r.open_issues_count ?? r.openIssuesCount}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-xs flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
              <Star size={10} />
              {r.stargazers_count ?? r.stargazersCount ?? 0}
            </span>
          </a>
        ))}
      </div>
    </Glass>
  )
}

// ── JArvis mini ───────────────────────────────────────────────────────────
function JArvisWidget() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hey! Was brauchst du?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input }
    const hist = [...messages, userMsg]
    setMessages(hist)
    setInput('')
    setLoading(true)
    try {
      const r = await api.post('/jarvis/chat', { messages: hist })
      setMessages(h => [...h, { role: 'assistant', content: r.data.content ?? '…' }])
    } catch {
      setMessages(h => [...h, { role: 'assistant', content: 'Verbindungsfehler.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden"
         style={{
           background: 'rgba(10,6,2,0.7)',
           border: '1px solid rgba(255,160,0,0.18)',
           backdropFilter: 'blur(12px)',
         }}>
      {/* header */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(255,160,0,0.1)' }}>
        <div style={{ transform: 'scale(0.55)', transformOrigin: 'left center', width: 28, height: 28, flexShrink: 0, overflow: 'visible' }}>
          <JArvisOrb size={50} pulsing={loading} />
        </div>
        <span className="text-xs font-semibold tracking-widest uppercase ml-1"
              style={{ color: 'rgba(255,180,0,0.6)' }}>JArvis</span>
        {loading && (
          <div className="ml-auto flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full animate-bounce"
                   style={{ background: 'rgba(255,180,0,0.7)', animationDelay: `${i*0.15}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] px-3 py-1.5 rounded-xl text-xs leading-relaxed"
                 style={m.role === 'user' ? {
                   background: 'rgba(255,140,0,0.15)',
                   border: '1px solid rgba(255,160,0,0.2)',
                   color: '#ffe0a0',
                 } : {
                   background: 'rgba(255,255,255,0.04)',
                   border: '1px solid rgba(255,160,0,0.08)',
                   color: '#c8b890',
                 }}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="px-3 py-2 flex gap-1.5 flex-shrink-0"
           style={{ borderTop: '1px solid rgba(255,160,0,0.08)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Frag JArvis…"
          className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{
            background: 'rgba(255,160,0,0.07)',
            border: '1px solid rgba(255,160,0,0.15)',
            color: '#ffe0a0',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-opacity"
          style={{
            background: 'rgba(255,140,0,0.2)',
            border: '1px solid rgba(255,160,0,0.25)',
            color: '#ffcc44',
            opacity: (!input.trim() || loading) ? 0.35 : 1,
          }}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  )
}

// ── News ──────────────────────────────────────────────────────────────────
const FEEDS = [
  { key: 'de' as const,      label: 'DE',      icon: Flag,      color: '#fbbf24' },
  { key: 'world' as const,   label: 'Welt',    icon: Globe,     color: '#60a5fa' },
  { key: 'bvb' as const,     label: 'BVB',     icon: Trophy,    color: '#facc15' },
  { key: 'vikings' as const, label: 'Vikings', icon: Trophy,    color: '#a78bfa' },
]

type FeedKey = 'de' | 'world' | 'bvb' | 'vikings'

function NewsWidget() {
  const [tab, setTab] = useState<FeedKey>('de')

  const { data: items = [], isLoading, error } = useQuery<NewsItem[]>({
    queryKey: ['news', tab],
    queryFn: () => endpoints.news(tab).then(r => r.data),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  return (
    <Glass className="h-full">
      <WidgetHeader
        icon={Newspaper}
        title="Nachrichten"
        color="#f0f6fc"
        right={
          <div className="flex gap-1">
            {FEEDS.map(f => (
              <button
                key={f.key}
                onClick={() => setTab(f.key)}
                className="px-2 py-0.5 rounded-lg text-xs transition-all"
                style={{
                  background: tab === f.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: tab === f.key ? '#f0f6fc' : 'rgba(255,255,255,0.3)',
                  fontWeight: tab === f.key ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {isLoading && (
          <div className="space-y-2 pt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse"
                   style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <AlertCircle size={24} style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Feed nicht erreichbar
            </p>
          </div>
        )}
        {!isLoading && !error && items.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl transition-all group"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid transparent',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-snug line-clamp-2"
                 style={{ color: 'rgba(255,255,255,0.85)' }}>
                {item.title}
              </p>
              <ExternalLink size={11} className="flex-shrink-0 mt-0.5"
                            style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
            {item.description && (
              <p className="text-xs mt-1 line-clamp-1 leading-snug"
                 style={{ color: 'rgba(255,255,255,0.3)' }}>
                {item.description}
              </p>
            )}
            {item.pubDate && (
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.18)' }}>
                {formatDate(item.pubDate)}
              </p>
            )}
          </a>
        ))}
      </div>
    </Glass>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin mx-auto"
         style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'transparent' }} />
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs p-4" style={{ color: 'rgba(255,255,255,0.2)' }}>{children}</p>
  )
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  } catch { return s }
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#080b14', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Top bar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#f0f6fc' }}>Dashboard</h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Grid — fills remaining height */}
      <div className="flex-1 grid gap-3 min-h-0" style={{
        gridTemplateColumns: '1fr 1fr 1fr 1.6fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gridTemplateAreas: `
          "server  stats   jarvis  news"
          "todos   todos   jarvis  news"
          "github  github  jarvis  news"
        `,
      }}>
        <div style={{ gridArea: 'server' }}><ServerWidget /></div>
        <div style={{ gridArea: 'stats' }}><StatsWidget /></div>
        <div style={{ gridArea: 'jarvis' }}><JArvisWidget /></div>
        <div style={{ gridArea: 'news' }}><NewsWidget /></div>
        <div style={{ gridArea: 'todos' }}><TodosWidget /></div>
        <div style={{ gridArea: 'github' }}><GitHubWidget /></div>
      </div>
    </div>
  )
}
