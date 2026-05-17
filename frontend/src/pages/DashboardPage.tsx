import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Flame, Check, ExternalLink, TrendingUp } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Habit, Todo, FinanceSummary, Goal, JournalEntry, QuickNote, CalendarEvent, ServerStatus } from '../api/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: 'Klar', icon: '☀️' }, 1: { label: 'Meist klar', icon: '🌤️' },
  2: { label: 'Teilw. bewölkt', icon: '⛅' }, 3: { label: 'Bedeckt', icon: '☁️' },
  45: { label: 'Nebel', icon: '🌫️' }, 61: { label: 'Regen', icon: '🌧️' },
  80: { label: 'Schauer', icon: '🌦️' }, 95: { label: 'Gewitter', icon: '⛈️' },
}
const wmo = (c: number) => WMO[c] ?? { label: '–', icon: '🌡️' }
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

// ── Card shell ────────────────────────────────────────────────────────────
function Card({ title, meta, children, href, color }: {
  title: string; meta?: React.ReactNode; children: React.ReactNode; href?: string; color?: string
}) {
  const inner = (
    <div className="card" style={href ? { cursor: 'pointer' } : {}}>
      <div className="card-h">
        <span className="accent-dot" style={color ? { background: color } : {}} />
        <span className="title">{title}</span>
        <div className="spacer" />
        {meta && <span className="meta">{meta}</span>}
      </div>
      <div className="card-b">{children}</div>
    </div>
  )
  if (href) return <Link to={href} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
  return inner
}

// ── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  const h = now.getHours()
  const greet = h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 14 ? 'Mittag' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const kw = Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)
  return (
    <div className="hero">
      <div>
        <div className="greet">{greet}, Lars. <em>Willkommen zurück.</em></div>
        <div className="sub">{dateStr}</div>
      </div>
      <div className="clock">{timeStr}<small>KW {String(kw).padStart(2, '0')}</small></div>
    </div>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────
function StatsRow() {
  const month = new Date().toISOString().slice(0, 7)
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ['habits'], queryFn: () => endpoints.habits().then(r => r.data) })
  const { data: todos = [] } = useQuery<Todo[]>({ queryKey: ['todos'], queryFn: () => endpoints.todos().then(r => r.data) })
  const { data: summary } = useQuery<FinanceSummary>({ queryKey: ['financeSummary', month], queryFn: () => endpoints.financeSummary(month).then(r => r.data) })
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ['goals', 'active'], queryFn: () => endpoints.goals({ status: 'active' }).then(r => r.data) })

  const habitsDone = habits.filter(h => h.done_today === 1).length
  const openTodos  = todos.filter(t => !t.done).length
  const income     = summary?.monthlyIncome ?? 0
  const expenses   = summary?.expenses ?? 0
  const remaining  = income - expenses

  return (
    <div className="bento" style={{ marginBottom: 24 }}>
      <div className="col-3 stat">
        <div className="l">Habits heute</div>
        <div className="v">{habitsDone}<span className="unit">/{habits.length}</span></div>
        <div className={`delta ${habitsDone === habits.length && habits.length > 0 ? 'up' : ''}`}>
          {habitsDone === habits.length && habits.length > 0 ? <><TrendingUp size={12} /> Alle erledigt</> : `${habits.length - habitsDone} offen`}
        </div>
      </div>
      <div className="col-3 stat">
        <div className="l">Offene Aufgaben</div>
        <div className="v">{openTodos}</div>
        <div className="delta">{openTodos === 0 ? 'Alles erledigt ✓' : `${todos.filter(t => t.done).length} erledigt`}</div>
      </div>
      <div className="col-3 stat">
        <div className="l">Budget übrig</div>
        <div className="v" style={{ color: remaining < 0 ? 'var(--rose)' : 'var(--accent)', fontSize: income > 0 ? 22 : 28 }}>
          {income > 0 ? fmt(remaining) : '—'}
        </div>
        <div className={`delta ${remaining < 0 ? 'down' : ''}`}>{income > 0 ? `von ${fmt(income)}` : 'Nicht konfiguriert'}</div>
      </div>
      <div className="col-3 stat">
        <div className="l">Aktive Ziele</div>
        <div className="v">{goals.length}</div>
        <div className="delta">{goals.length > 0 ? `Ø ${Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)} %` : 'Noch keine'}</div>
      </div>
    </div>
  )
}

// ── Habits widget ─────────────────────────────────────────────────────────
function HabitsCard() {
  const qc = useQueryClient()
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ['habits'], queryFn: () => endpoints.habits().then(r => r.data) })
  const toggle = useMutation({ mutationFn: (id: number) => endpoints.toggleHabit(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }) })
  const done = habits.filter(h => h.done_today === 1).length
  return (
    <Card href="/habits" title="Gewohnheiten" meta={`${done} / ${habits.length} heute`}>
      <div style={{ marginTop: -8 }}>
        {habits.length === 0 && <div className="empty">Noch keine Habits</div>}
        {habits.slice(0, 6).map(h => (
          <div key={h.id} className={`habit-row ${h.done_today ? 'on' : ''}`}
            onClick={e => { e.preventDefault(); toggle.mutate(h.id) }}>
            <div className={`check ${h.done_today ? 'on' : ''}`}>
              {!!h.done_today && <Check size={12} />}
            </div>
            <span className="name">{h.icon} {h.name}</span>
            {h.total_done > 0 && <span className="streak"><Flame size={11} /> {h.total_done}</span>}
          </div>
        ))}
        {habits.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="bar"><div className="fill" style={{ width: `${(done / habits.length) * 100}%` }} /></div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Todos widget ──────────────────────────────────────────────────────────
function TodosCard() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const { data: todos = [] } = useQuery<Todo[]>({ queryKey: ['todos'], queryFn: () => endpoints.todos().then(r => r.data) })
  const create = useMutation({ mutationFn: () => endpoints.createTodo(draft), onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); setDraft('') } })
  const done = useMutation({ mutationFn: ({ id, d }: { id: number; d: boolean }) => endpoints.doneTodo(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }) })
  const open = todos.filter(t => !t.done)
  return (
    <Card title="Aufgaben" meta={`${open.length} offen`}>
      <div style={{ marginTop: -8 }}>
        <div className="composer">
          <Plus size={13} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
          <input placeholder="Neue Aufgabe…" value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) create.mutate() }} />
          <span className="kbd">⏎</span>
        </div>
        {open.length === 0 && <div className="empty">Alles erledigt ✓</div>}
        {open.slice(0, 5).map(t => (
          <div key={t.id} className="todo" onClick={() => done.mutate({ id: t.id, d: true })} style={{ cursor: 'pointer' }}>
            <div className="box" />
            <span className="text">{t.text}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Heute (Calendar) ──────────────────────────────────────────────────────
function TodayCard() {
  const today = new Date().toISOString().slice(0, 10)
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['calendarToday', today],
    queryFn: () => endpoints.calendarEvents(today, today).then(r => r.data),
  })
  const label = new Date().toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <Card href="/calendar" title="Heute" meta={`${events.length} Termine · ${label}`}>
      {events.length === 0
        ? <div className="empty">Keine Termine heute</div>
        : events.map(e => (
          <div key={e.id} className="agenda-item">
            <div className="time">{e.start_time ?? '–'}</div>
            <div className="bar" style={{ background: e.color ?? 'var(--accent)' }} />
            <div className="body">
              <div className="t">{e.title}</div>
              {e.notes && <div className="s">{e.notes}</div>}
            </div>
          </div>
        ))
      }
    </Card>
  )
}

// ── Finance ───────────────────────────────────────────────────────────────
function FinanceCard() {
  const month = new Date().toISOString().slice(0, 7)
  const { data: summary } = useQuery<FinanceSummary>({ queryKey: ['financeSummary', month], queryFn: () => endpoints.financeSummary(month).then(r => r.data) })
  const income   = summary?.monthlyIncome ?? 0
  const expenses = summary?.expenses ?? 0
  const pct = income > 0 ? Math.min(expenses / income, 1) : 0
  if (!income) return (
    <Card href="/finance" title="Finanzen · Mai">
      <div className="empty">Einkommen nicht konfiguriert</div>
    </Card>
  )
  return (
    <Card href="/finance" title={`Finanzen · ${new Date().toLocaleDateString('de-DE', { month: 'long' })}`}
      meta={<span className={`pill ${pct > 0.9 ? 'danger' : pct > 0.75 ? 'warn' : 'success'}`}><span className="dot" />{pct > 0.9 ? 'kritisch' : pct > 0.75 ? 'knapp' : 'im Plan'}</span>}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div className="display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em' }}>{fmt(income - expenses)}</div>
          <div style={{ color: 'var(--fg-3)', fontSize: 12.5, marginTop: 2 }}>übrig · {Math.round((1 - pct) * 100)} %</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fmt(expenses)} / {fmt(income)}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>verbraucht</div>
        </div>
      </div>
      <div className="bar" style={{ height: 6 }}>
        <div className="fill" style={{ width: `${pct * 100}%`, background: pct > 0.9 ? 'var(--rose)' : pct > 0.75 ? 'var(--amber)' : 'var(--accent)' }} />
      </div>
      {(summary?.byCategory ?? []).filter(c => c.spent > 0).slice(0, 4).map(c => (
        <div key={c.id} className="tx">
          <div className="ic">{c.icon}</div>
          <div className="who"><div className="t">{c.name}</div></div>
          <div className="amt out">{fmt(c.spent)}</div>
        </div>
      ))}
    </Card>
  )
}

// ── Goals ─────────────────────────────────────────────────────────────────
function GoalsCard() {
  const { data: goals = [] } = useQuery<Goal[]>({ queryKey: ['goals', 'active'], queryFn: () => endpoints.goals({ status: 'active' }).then(r => r.data) })
  const HORIZON_COLORS: Record<string, string> = { week: 'var(--green)', month: 'var(--accent)', year: '#8E5BFF', life: 'var(--amber)' }
  const HORIZON_LABEL: Record<string, string> = { week: 'Woche', month: 'Monat', year: 'Jahr', life: 'Langfristig' }
  return (
    <Card href="/goals" title="Ziele" meta={`${goals.length} aktiv`}>
      <div style={{ paddingTop: 4, paddingBottom: 4 }}>
        {goals.length === 0 && <div className="empty">Keine aktiven Ziele</div>}
        {goals.slice(0, 4).map(g => (
          <div key={g.id} className="goal">
            <div className="gh">
              <span className="name">{g.title}</span>
              <span className="pct">{g.progress}<small style={{ color: 'var(--fg-4)', fontSize: 11 }}>%</small></span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span className="horizon">{HORIZON_LABEL[g.horizon] ?? g.horizon}</span>
            </div>
            <div className="bar thin">
              <div className="fill" style={{ width: `${g.progress}%`, background: HORIZON_COLORS[g.horizon] ?? 'var(--accent)' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Journal ───────────────────────────────────────────────────────────────
function JournalCard() {
  const { data: today } = useQuery<JournalEntry | null>({ queryKey: ['journalToday'], queryFn: () => endpoints.journalToday().then(r => r.data).catch(() => null) })
  const EMOJI = ['', '😞', '😕', '🙂', '😊', '😄']
  const LABELS = ['', 'Schlecht', 'Mau', 'OK', 'Gut', 'Stark']
  const mood = today?.mood ?? 0
  const r = 22, c = 2 * Math.PI * r, off = c - (mood / 5) * c
  return (
    <Card href="/journal" title="Journal" meta={today ? `Mood ${mood}/5` : undefined}>
      {today ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="ring">
            <svg width="56" height="56">
              <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth="4" />
              <circle cx="28" cy="28" r={r} fill="none" stroke="var(--accent)" strokeWidth="4"
                strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
            </svg>
            <div className="val">{mood}<small style={{ fontSize: 9, color: 'var(--fg-4)' }}>/5</small></div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Stimmung: {LABELS[mood]} {EMOJI[mood]}</div>
            {today.content && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 4, lineHeight: 1.5 }}>„{today.content.slice(0, 100)}{today.content.length > 100 ? '…' : ''}"</div>}
          </div>
        </div>
      ) : (
        <div className="empty" style={{ padding: '16px 0' }}>
          Heute noch kein Eintrag — <Link to="/journal" style={{ color: 'var(--accent)' }}>Jetzt eintragen →</Link>
        </div>
      )}
    </Card>
  )
}

// ── Notes ─────────────────────────────────────────────────────────────────
function NotesCard() {
  const { data: notes = [] } = useQuery<QuickNote[]>({ queryKey: ['notes'], queryFn: () => endpoints.notes().then(r => r.data) })
  const shown = [...notes.filter(n => n.pinned).slice(0, 2), ...notes.filter(n => !n.pinned)].slice(0, 3)
  const NOTE_BG: Record<string, string> = {
    default: 'var(--surface-sunk)', yellow: 'rgba(197,138,0,0.08)',
    green: 'rgba(47,143,78,0.08)', red: 'rgba(200,52,74,0.08)', blue: 'rgba(28,107,255,0.08)',
  }
  return (
    <Card href="/notes" title="Notizen" meta={`${notes.length} gespeichert`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.length === 0 && <div className="empty">Noch keine Notizen</div>}
        {shown.map(n => (
          <div key={n.id} className={`note ${n.pinned ? 'pin' : ''}`} style={{ background: NOTE_BG[n.color] ?? NOTE_BG.default }}>
            {n.title && <div className="t">{n.title}</div>}
            <div>{n.content.slice(0, 80)}{n.content.length > 80 ? '…' : ''}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Server ────────────────────────────────────────────────────────────────
function ServerCard() {
  const { data: status, error } = useQuery<ServerStatus>({
    queryKey: ['serverStatus'], queryFn: () => endpoints.serverStatus().then(r => r.data),
    refetchInterval: 30_000, retry: false,
  })
  return (
    <Card href="/server" title="Server"
      meta={status
        ? <span className={`pill ${status.reachable ? 'success' : 'danger'}`}><span className="dot" />{status.reachable ? `Online · ${status.responseTimeMs}ms` : 'Offline'}</span>
        : undefined}>
      {error && <div className="empty">Nicht konfiguriert</div>}
      {status && (
        <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
          <span className="mono">{status.host}</span>
        </div>
      )}
    </Card>
  )
}

// ── GitHub ────────────────────────────────────────────────────────────────
function GithubCard() {
  const { data: repos = [], error } = useQuery<any[]>({ queryKey: ['githubRepos'], queryFn: () => endpoints.githubRepos().then(r => r.data), retry: false })
  return (
    <Card href="/github" title="GitHub" meta={repos.length > 0 ? `${repos.length} Repos` : undefined}>
      {error && <div className="empty">Token nicht konfiguriert</div>}
      {repos.slice(0, 4).map((r: any) => (
        <div key={r.id ?? r.full_name} className="repo">
          <span className="lang" />
          <span className="name">{r.name ?? (r.full_name ?? '').split('/')[1]}</span>
          <span className="meta">
            {(r.open_issues_count ?? r.openIssuesCount ?? 0) > 0 && (
              <span style={{ color: 'var(--amber)' }}>{r.open_issues_count ?? r.openIssuesCount} Issues</span>
            )}
          </span>
        </div>
      ))}
    </Card>
  )
}

// ── Weather ───────────────────────────────────────────────────────────────
function WeatherCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['weather'],
    queryFn: async () => {
      let lat = 51.5142, lon = 7.4652
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }))
        lat = pos.coords.latitude; lon = pos.coords.longitude
      } catch { /* fallback */ }
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&wind_speed_unit=kmh&timezone=auto&forecast_days=4`)
      return r.json()
    },
    staleTime: 30 * 60_000, retry: 1,
  })
  const cur = data?.current
  const days = data?.daily
  return (
    <div className="card">
      <div className="card-h">
        <span className="accent-dot" />
        <span className="title">Wetter</span>
      </div>
      <div className="card-b">
        {isLoading && <div className="skeleton" style={{ height: 64 }} />}
        {cur && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 40 }}>{wmo(cur.weathercode).icon}</span>
              <div>
                <div className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {Math.round(cur.temperature_2m)}<small style={{ fontSize: 18, color: 'var(--fg-3)' }}>°C</small>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 4 }}>
                  {wmo(cur.weathercode).label} · {Math.round(cur.windspeed_10m)} km/h
                </div>
              </div>
            </div>
            {days && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {days.time.slice(0, 4).map((d: string, i: number) => (
                  <div key={d} style={{
                    background: i === 0 ? 'var(--accent-soft)' : 'var(--surface-sunk)',
                    color: i === 0 ? 'var(--accent)' : 'var(--fg-2)',
                    borderRadius: 10, padding: '10px 6px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      {i === 0 ? 'Heute' : DAYS[new Date(d).getDay()]}
                    </div>
                    <div style={{ fontSize: 18 }}>{wmo(days.weathercode[i]).icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{Math.round(days.temperature_2m_max[i])}°</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── News ──────────────────────────────────────────────────────────────────
type FeedKey = 'de' | 'world' | 'bvb' | 'vikings'
const FEEDS: { key: FeedKey; label: string }[] = [
  { key: 'de', label: 'DE' }, { key: 'world', label: 'Welt' },
  { key: 'bvb', label: 'BVB' }, { key: 'vikings', label: 'Vikings' },
]

function NewsCard() {
  const [tab, setTab] = useState<FeedKey>('de')
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['news', tab],
    queryFn: () => endpoints.news(tab).then(r => r.data),
    staleTime: 5 * 60_000, retry: 1,
  })
  return (
    <div className="card">
      <div className="card-h">
        <span className="accent-dot" />
        <span className="title">Nachrichten</span>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: 2 }}>
          {FEEDS.map(f => (
            <button key={f.key} onClick={() => setTab(f.key)}
              style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 500,
                background: tab === f.key ? 'var(--surface-sunk)' : 'transparent',
                color: tab === f.key ? 'var(--fg)' : 'var(--fg-4)',
                border: 0, cursor: 'pointer',
              }}>{f.label}</button>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', padding: 'var(--pad-card)' }}>
        {isLoading && [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8 }} />)}
        {items.slice(0, 6).map((item: any, i: number) => (
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <span style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.45, flex: 1 }}>{item.title}</span>
            <ExternalLink size={10} style={{ color: 'var(--fg-4)', flexShrink: 0, marginTop: 2 }} />
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="content">
      <Hero />
      <StatsRow />
      <div className="bento">
        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TodayCard />
          <div className="bento" style={{ gap: 16 }}>
            <div className="col-6"><HabitsCard /></div>
            <div className="col-6"><TodosCard /></div>
          </div>
          <div className="bento" style={{ gap: 16 }}>
            <div className="col-6"><GoalsCard /></div>
            <div className="col-6"><FinanceCard /></div>
          </div>
        </div>
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <WeatherCard />
          <JournalCard />
          <NotesCard />
          <ServerCard />
          <GithubCard />
          <NewsCard />
        </div>
      </div>
    </div>
  )
}
