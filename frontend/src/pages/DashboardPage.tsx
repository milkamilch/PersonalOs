import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wifi, CheckSquare, GitBranch, AlertCircle, ExternalLink,
  Plus, Trash2, Newspaper, Repeat2, Wallet, Target,
  CircleCheck, TrendingDown, BookOpen, ChevronRight, StickyNote, Calendar
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { endpoints } from '../api/client'
import type { ServerStatus, Todo, NewsItem, Habit, FinanceSummary, Goal, JournalEntry, QuickNote, CalendarEvent } from '../api/types'

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}
function timeAgo(s: string) {
  try {
    const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
    if (d === 0) return 'heute'
    if (d === 1) return 'gestern'
    return `vor ${d}d`
  } catch { return '' }
}

// ── Widget shell ──────────────────────────────────────────────────────────
function Widget({ children, className = '', href }: { children: React.ReactNode; className?: string; href?: string }) {
  const inner = (
    <div className={`rounded-2xl flex flex-col overflow-hidden ${className}`}
         style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      {children}
    </div>
  )
  if (href) return <Link to={href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
  return inner
}

function WHead({ icon: Icon, title, color, right }: {
  icon: React.ElementType; title: string; color?: string; right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
         style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <Icon size={12} style={{ color: color ?? 'var(--text-muted)' }} />
        <span className="text-[10px] font-semibold tracking-[0.08em] uppercase"
              style={{ color: 'var(--text-muted)' }}>{title}</span>
      </div>
      {right ?? <ChevronRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
    </div>
  )
}

// ── Greeting ──────────────────────────────────────────────────────────────
function GreetingBar() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const h = time.getHours()
  const greeting = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const dateStr = time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-baseline justify-between mb-5 flex-shrink-0 px-1">
      <div>
        <h1 className="font-semibold" style={{ fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {greeting}, Lars
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{dateStr}</p>
      </div>
      <span className="text-2xl font-light tabular-nums" style={{ color: 'var(--text-secondary)' }}>{timeStr}</span>
    </div>
  )
}

// ── Quick-stats row ───────────────────────────────────────────────────────
function QuickStats() {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: () => endpoints.habits().then(r => r.data),
  })
  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: () => endpoints.todos().then(r => r.data),
  })
  const { data: summary } = useQuery<FinanceSummary>({
    queryKey: ['financeSummary', month],
    queryFn: () => endpoints.financeSummary(month).then(r => r.data),
  })
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['goals', 'active'],
    queryFn: () => endpoints.goals({ status: 'active' }).then(r => r.data),
  })

  const habitsDone  = habits.filter(h => h.done_today === 1).length
  const openTodos   = todos.filter(t => !t.done).length
  const budget      = summary?.monthlyIncome ?? 0
  const spent       = summary?.expenses ?? 0
  const remaining   = budget - spent
  const budgetOver  = budget > 0 && spent > budget

  const stats = [
    {
      label: 'Habits',
      value: `${habitsDone}/${habits.length}`,
      icon: Repeat2,
      color: habitsDone === habits.length && habits.length > 0 ? 'var(--green)' : 'var(--accent)',
      href: '/habits',
    },
    {
      label: 'Todos',
      value: openTodos,
      icon: CheckSquare,
      color: openTodos === 0 ? 'var(--green)' : 'var(--accent)',
      href: '/todos',
    },
    {
      label: 'Budget',
      value: budget > 0 ? fmt(remaining) : '—',
      icon: budgetOver ? TrendingDown : Wallet,
      color: budgetOver ? 'var(--red)' : budget > 0 && spent / budget > 0.8 ? 'var(--yellow)' : 'var(--green)',
      href: '/finance',
    },
    {
      label: 'Ziele',
      value: goals.length,
      icon: Target,
      color: 'var(--accent)',
      href: '/goals',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 mb-5 flex-shrink-0">
      {stats.map(s => (
        <Link key={s.label} to={s.href} style={{ textDecoration: 'none' }}>
          <div className="flex flex-col items-center justify-center py-3 rounded-2xl gap-1 transition-all active:scale-95"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <s.icon size={16} style={{ color: s.color }} />
            <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Habits ────────────────────────────────────────────────────────────────
function HabitsWidget() {
  const qc = useQueryClient()
  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: () => endpoints.habits().then(r => r.data),
    refetchInterval: 60_000,
  })
  const toggle = useMutation({
    mutationFn: (id: number) => endpoints.toggleHabit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })

  const done  = habits.filter(h => h.done_today === 1).length
  const total = habits.length

  return (
    <Widget href="/habits">
      <WHead icon={Repeat2} title={`Habits · ${done}/${total}`} color="var(--accent)"
        right={done === total && total > 0
          ? <span style={{ color: 'var(--green)', fontSize: 11 }}>Alle ✓</span>
          : <ChevronRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
      />
      <div className="p-3 space-y-1">
        {habits.length === 0 && (
          <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>Noch keine Habits</p>
        )}
        {habits.slice(0, 6).map(h => (
          <button key={h.id}
                  onClick={e => { e.preventDefault(); toggle.mutate(h.id) }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all text-left active:scale-[0.98]"
                  style={{ background: h.done_today ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'rgba(255,255,255,0.02)' }}>
            <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                 style={{ background: h.done_today ? h.color : 'rgba(255,255,255,0.05)',
                          border: `1.5px solid ${h.done_today ? h.color : 'rgba(255,255,255,0.12)'}` }}>
              {h.done_today === 1 && <CircleCheck size={11} color="white" />}
            </div>
            <span className="text-sm flex-1 truncate"
                  style={{ color: h.done_today ? 'var(--text-muted)' : 'var(--text-secondary)',
                           textDecoration: h.done_today ? 'line-through' : 'none' }}>
              {h.icon} {h.name}
            </span>
          </button>
        ))}
        {total > 0 && (
          <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="h-full rounded-full transition-all duration-500"
                 style={{ width: `${(done / total) * 100}%`,
                          background: done === total ? 'var(--green)' : 'var(--accent)' }} />
          </div>
        )}
      </div>
    </Widget>
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
    <Widget>
      <WHead icon={CheckSquare} title={`Todos · ${open.length} offen`} color="var(--accent)"
        right={
          <Link to="/todos" style={{ color: 'var(--text-muted)' }}>
            <ChevronRight size={12} style={{ opacity: 0.4 }} />
          </Link>
        }
      />
      <div className="p-3 space-y-1">
        <div className="flex gap-2 mb-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && text.trim() && create.mutate()}
            placeholder="Neue Aufgabe…"
            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
          <button onClick={() => text.trim() && create.mutate()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95"
                  style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}>
            <Plus size={16} />
          </button>
        </div>
        {open.length === 0 && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Alles erledigt ✓</p>
        )}
        {open.slice(0, 5).map(t => (
          <div key={t.id}
               className="flex items-center gap-2.5 px-2 py-2 rounded-xl group"
               style={{ background: 'rgba(255,255,255,0.02)' }}>
            <button onClick={() => done.mutate({ id: t.id, d: true })}
                    className="w-4 h-4 rounded border flex-shrink-0 transition-colors active:scale-90"
                    style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{t.text}</span>
            <button onClick={() => del.mutate(t.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--red)' }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ── Finance ───────────────────────────────────────────────────────────────
function FinanceWidget() {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: summary } = useQuery<FinanceSummary>({
    queryKey: ['financeSummary', month],
    queryFn: () => endpoints.financeSummary(month).then(r => r.data),
  })

  const income   = summary?.monthlyIncome ?? 0
  const expenses = summary?.expenses ?? 0
  const pct      = income > 0 ? Math.min(expenses / income, 1) : 0
  const over     = income > 0 && expenses > income
  const barColor = over ? 'var(--red)' : pct > 0.8 ? 'var(--yellow)' : 'var(--green)'

  return (
    <Widget href="/finance">
      <WHead icon={Wallet} title="Finanzen" color="var(--yellow)" />
      <div className="p-4 space-y-3">
        {income === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Einkommen noch nicht konfiguriert</p>
        ) : (
          <>
            <div className="flex justify-between items-baseline">
              <div>
                <p className="text-xl font-semibold tabular-nums"
                   style={{ color: over ? 'var(--red)' : 'var(--text-primary)' }}>
                  {fmt(expenses)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>ausgegeben</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: over ? 'var(--red)' : 'var(--green)' }}>
                  {over ? '−' : '+'}{fmt(Math.abs(income - expenses))}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{over ? 'überzogen' : 'übrig'}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>0</span><span>{Math.round(pct * 100)}%</span><span>{fmt(income)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${pct * 100}%`, background: barColor }} />
              </div>
            </div>
            <div className="space-y-1.5">
              {(summary?.byCategory ?? []).filter(c => c.spent > 0).slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="text-xs">{c.icon}</span>
                  <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{c.name}</span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmt(c.spent)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Widget>
  )
}

// ── Goals ─────────────────────────────────────────────────────────────────
function GoalsWidget() {
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['goals', 'active'],
    queryFn: () => endpoints.goals({ status: 'active' }).then(r => r.data),
  })

  const HORIZON_COLOR: Record<string, string> = {
    week: 'var(--green)', month: 'var(--accent)', year: '#a78bfa', life: 'var(--yellow)'
  }

  return (
    <Widget href="/goals">
      <WHead icon={Target} title="Aktive Ziele" color="var(--accent)" />
      <div className="p-3 space-y-2">
        {goals.length === 0 && (
          <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>Keine aktiven Ziele</p>
        )}
        {goals.slice(0, 4).map(g => (
          <div key={g.id} className="px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                   style={{ background: HORIZON_COLOR[g.horizon] ?? 'var(--accent)' }} />
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{g.title}</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{g.progress}%</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden ml-3.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all"
                   style={{ width: `${g.progress}%`, background: HORIZON_COLOR[g.horizon] ?? 'var(--accent)' }} />
            </div>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ── Journal mood ──────────────────────────────────────────────────────────
function JournalWidget() {
  const { data: today } = useQuery<JournalEntry | null>({
    queryKey: ['journalToday'],
    queryFn: () => endpoints.journalToday().then(r => r.data).catch(() => null),
  })

  const MOOD_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄']
  const MOOD_COLOR = ['', 'var(--red)', 'var(--yellow)', 'var(--text-muted)', 'var(--green)', '#34d399']

  return (
    <Widget href="/journal">
      <WHead icon={BookOpen} title="Journal" color="var(--green)" />
      <div className="p-4 flex items-center gap-3">
        {today ? (
          <>
            <span className="text-3xl">{MOOD_EMOJI[today.mood]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: MOOD_COLOR[today.mood] }}>
                Stimmung {today.mood}/5
              </p>
              {today.content && (
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                  {today.content}
                </p>
              )}
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {timeAgo(today.created_at)}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 w-full">
            <BookOpen size={20} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Heute noch kein Eintrag</p>
            <span className="ml-auto text-xs font-medium" style={{ color: 'var(--accent)' }}>Eintragen →</span>
          </div>
        )}
      </div>
    </Widget>
  )
}

// ── Weather ───────────────────────────────────────────────────────────────
const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: 'Klar', icon: '☀️' }, 1: { label: 'Meist klar', icon: '🌤️' },
  2: { label: 'Teilw. bewölkt', icon: '⛅' }, 3: { label: 'Bedeckt', icon: '☁️' },
  45: { label: 'Nebel', icon: '🌫️' }, 48: { label: 'Nebel', icon: '🌫️' },
  51: { label: 'Nieselregen', icon: '🌦️' }, 61: { label: 'Regen', icon: '🌧️' },
  71: { label: 'Schnee', icon: '❄️' }, 80: { label: 'Schauer', icon: '🌦️' },
  95: { label: 'Gewitter', icon: '⛈️' },
}
function wmo(code: number) { return WMO[code] ?? { label: 'Unbekannt', icon: '🌡️' } }

function WeatherWidget() {
  const LAT = 51.5142  // Dortmund default — uses browser geolocation if available
  const LON = 7.4652
  const { data, isLoading } = useQuery({
    queryKey: ['weather'],
    queryFn: async () => {
      let lat = LAT, lon = LON
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }))
        lat = pos.coords.latitude; lon = pos.coords.longitude
      } catch { /* use default */ }
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&wind_speed_unit=kmh&timezone=auto&forecast_days=4`
      const r = await fetch(url)
      return r.json()
    },
    staleTime: 30 * 60_000,
    retry: 1,
  })

  const cur  = data?.current
  const days = data?.daily

  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  return (
    <Widget>
      <WHead icon={Wifi} title="Wetter" color="var(--accent)"
        right={<span />}
      />
      <div className="p-4">
        {isLoading && <div className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />}
        {cur && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{wmo(cur.weathercode).icon}</span>
              <div>
                <p className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {Math.round(cur.temperature_2m)}°C
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {wmo(cur.weathercode).label} · Wind {Math.round(cur.windspeed_10m)} km/h
                </p>
              </div>
            </div>
            {days && (
              <div className="grid grid-cols-4 gap-1">
                {days.time.slice(0, 4).map((d: string, i: number) => (
                  <div key={d} className="flex flex-col items-center py-2 rounded-xl gap-1"
                       style={{ background: i === 0 ? 'rgba(10,132,255,0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      {i === 0 ? 'Heute' : DAYS[new Date(d).getDay()]}
                    </span>
                    <span className="text-lg">{wmo(days.weathercode[i]).icon}</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {Math.round(days.temperature_2m_max[i])}°
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {Math.round(days.temperature_2m_min[i])}°
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Widget>
  )
}

// ── Notes ─────────────────────────────────────────────────────────────────
function NotesWidget() {
  const { data: notes = [] } = useQuery<QuickNote[]>({
    queryKey: ['notes'],
    queryFn: () => endpoints.notes().then(r => r.data),
  })

  const pinned   = notes.filter(n => n.pinned)
  const recent   = notes.filter(n => !n.pinned).slice(0, 3)
  const shown    = [...pinned.slice(0, 2), ...recent].slice(0, 3)

  const COLOR_BG: Record<string, string> = {
    default: 'rgba(255,255,255,0.03)',
    yellow:  'rgba(255,214,10,0.08)',
    green:   'rgba(48,209,88,0.08)',
    red:     'rgba(255,69,58,0.08)',
    blue:    'rgba(10,132,255,0.08)',
  }

  return (
    <Widget href="/notes">
      <WHead icon={StickyNote} title={`Notizen · ${notes.length}`} color="var(--yellow)" />
      <div className="p-3 space-y-1.5">
        {shown.length === 0 && (
          <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>Noch keine Notizen</p>
        )}
        {shown.map(n => (
          <div key={n.id} className="px-3 py-2.5 rounded-xl"
               style={{ background: COLOR_BG[n.color] ?? COLOR_BG.default }}>
            {n.title && <p className="text-xs font-semibold mb-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>}
            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{n.content}</p>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ── Server ────────────────────────────────────────────────────────────────
function ServerWidget() {
  const { data: status, error } = useQuery<ServerStatus>({
    queryKey: ['serverStatus'],
    queryFn: () => endpoints.serverStatus().then(r => r.data),
    refetchInterval: 30_000,
    retry: false,
  })

  return (
    <Widget href="/server">
      <WHead icon={Wifi} title="Server" color="var(--green)"
        right={status
          ? <span className="text-[10px] font-semibold" style={{ color: status.reachable ? 'var(--green)' : 'var(--red)' }}>
              {status.reachable ? 'ONLINE' : 'OFFLINE'}
            </span>
          : <ChevronRight size={12} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
      />
      <div className="px-4 py-3 flex items-center gap-3">
        {error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nicht konfiguriert</p>}
        {status && (
          <>
            <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                 style={{ background: status.reachable ? 'var(--green)' : 'var(--red)' }} />
            <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
              {status.host}
            </span>
            {status.reachable && status.responseTimeMs != null && (
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {status.responseTimeMs}ms
              </span>
            )}
          </>
        )}
      </div>
    </Widget>
  )
}

// ── GitHub ────────────────────────────────────────────────────────────────
function GitHubWidget() {
  const { data: rawRepos = [], error } = useQuery<any[]>({
    queryKey: ['githubRepos'],
    queryFn: () => endpoints.githubRepos().then(r => r.data),
    retry: false,
  })

  return (
    <Widget href="/github">
      <WHead icon={GitBranch} title="GitHub" color="var(--text-secondary)" />
      <div className="p-2 space-y-0.5">
        {error && <p className="text-xs px-2 py-2" style={{ color: 'var(--text-muted)' }}>Token nicht konfiguriert</p>}
        {rawRepos.slice(0, 4).map((r: any) => (
          <div key={r.id ?? r.full_name}
               className="flex items-center gap-2 px-2 py-2 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.02)' }}>
            <GitBranch size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
              {r.name ?? (r.full_name ?? '').split('/')[1]}
            </span>
            {(r.open_issues_count ?? r.openIssuesCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-xs flex-shrink-0"
                    style={{ color: 'var(--yellow)' }}>
                <AlertCircle size={10} />{r.open_issues_count ?? r.openIssuesCount}
              </span>
            )}
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ── Today ─────────────────────────────────────────────────────────────────
function TodayWidget() {
  const today = new Date().toISOString().slice(0, 10)
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['calendarToday', today],
    queryFn: () => endpoints.calendarEvents(today, today).then(r => r.data),
    staleTime: 2 * 60_000,
  })

  return (
    <Widget href="/calendar">
      <WHead icon={Calendar} title={`Heute · ${new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`} color="var(--accent)" />
      <div className="p-3 space-y-1">
        {events.length === 0 && (
          <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>Keine Termine heute</p>
        )}
        {events.map(e => (
          <div key={e.id} className="flex items-center gap-2 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color ?? 'var(--accent)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{e.title}</p>
              {e.start_time && (
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{e.start_time}{e.end_time ? ` – ${e.end_time}` : ''}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ── News ──────────────────────────────────────────────────────────────────
type FeedKey = 'de' | 'world' | 'bvb' | 'vikings'
const FEEDS: { key: FeedKey; label: string }[] = [
  { key: 'de', label: 'DE' }, { key: 'world', label: 'Welt' },
  { key: 'bvb', label: 'BVB' }, { key: 'vikings', label: 'Vikings' },
]

function NewsWidget() {
  const [tab, setTab] = useState<FeedKey>('de')
  const { data: items = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ['news', tab],
    queryFn: () => endpoints.news(tab).then(r => r.data),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  return (
    <Widget>
      <WHead icon={Newspaper} title="Nachrichten" color="var(--text-secondary)"
        right={
          <div className="flex gap-1">
            {FEEDS.map(f => (
              <button key={f.key} onClick={() => setTab(f.key)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background: tab === f.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                        color: tab === f.key ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}>
                {f.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="overflow-y-auto p-2 space-y-1" style={{ maxHeight: 380 }}>
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
        {items.slice(0, 8).map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
             className="block p-3 rounded-xl transition-colors"
             style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.02)' }}
             onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
             onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-snug line-clamp-2"
                 style={{ color: 'var(--text-secondary)' }}>{item.title}</p>
              <ExternalLink size={10} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
            </div>
            {item.pubDate && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {(() => { try { return new Date(item.pubDate).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' } })()}
              </p>
            )}
          </a>
        ))}
      </div>
    </Widget>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="overflow-y-auto" style={{ background: 'var(--bg-base)', minHeight: '100%' }}>
      <div style={{ padding: '20px 16px 96px', maxWidth: 1280, margin: '0 auto' }}>
        <GreetingBar />
        <QuickStats />

        {/* Desktop: 3-column grid | Tablet: 2-column | Mobile: single column */}
        <div className="grid gap-4"
             style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>

          {/* Column 1: Habits + Todos */}
          <div className="space-y-4">
            <HabitsWidget />
            <TodosWidget />
          </div>

          {/* Column 2: Today + Finance + Journal + Notes + Goals */}
          <div className="space-y-4">
            <TodayWidget />
            <FinanceWidget />
            <JournalWidget />
            <NotesWidget />
            <GoalsWidget />
          </div>

          {/* Column 3: Weather + Server + GitHub + News */}
          <div className="space-y-4">
            <WeatherWidget />
            <ServerWidget />
            <GitHubWidget />
            <NewsWidget />
          </div>

        </div>
      </div>
    </div>
  )
}
