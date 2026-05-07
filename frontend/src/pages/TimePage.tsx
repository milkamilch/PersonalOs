import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Trash2, Clock, Briefcase } from 'lucide-react'
import { endpoints } from '../api/client'
import type { TimeEntry, TimeSummary } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Input, Card, EmptyState } from '../components/ui'

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Heute'
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Gestern'
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

export default function TimePage() {
  const qc = useQueryClient()
  const [project, setProject]     = useState('')
  const [description, setDesc]    = useState('')
  const [elapsed, setElapsed]     = useState(0)

  const { data: running } = useQuery({
    queryKey: ['timeRunning'],
    queryFn: () => endpoints.timeRunning().then(r => r.data),
    refetchInterval: 5000,
  })
  const { data: entries = [] } = useQuery<TimeEntry[]>({
    queryKey: ['timeEntries'],
    queryFn: () => endpoints.timeEntries({ days: 30 }).then(r => r.data),
  })
  const { data: summary } = useQuery<TimeSummary>({
    queryKey: ['timeSummary'],
    queryFn: () => endpoints.timeSummary().then(r => r.data),
    refetchInterval: 30_000,
  })

  // Live elapsed counter
  useEffect(() => {
    if (!running?.running) { setElapsed(0); return }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(running.started_at).getTime()) / 1000)
      setElapsed(diff)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [running])

  const start = useMutation({
    mutationFn: () => endpoints.timeStart({ project, description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timeRunning'] }); qc.invalidateQueries({ queryKey: ['timeEntries'] }); qc.invalidateQueries({ queryKey: ['timeSummary'] }) },
  })
  const stop = useMutation({
    mutationFn: () => endpoints.timeStop(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timeRunning'] }); qc.invalidateQueries({ queryKey: ['timeEntries'] }); qc.invalidateQueries({ queryKey: ['timeSummary'] }) },
  })
  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteTimeEntry(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timeEntries'] }); qc.invalidateQueries({ queryKey: ['timeSummary'] }) },
  })

  const isRunning = running?.running === true

  // Group entries by date
  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    const date = e.started_at.slice(0, 10)
    if (!acc[date]) acc[date] = []
    acc[date].push(e)
    return acc
  }, {})

  return (
    <div className="page-root page-medium">
      <PageHeader title="Zeiterfassung" subtitle="Track deine Arbeitszeit und Projekte." />

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Heute', value: fmtDuration(summary.todayS) },
            { label: 'Diese Woche', value: fmtDuration(summary.weekS) },
            { label: 'Dieser Monat', value: fmtDuration(summary.monthS) },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Timer control */}
      <Card className="p-4 mb-6">
        {isRunning ? (
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--red)' }} />
            <div className="flex-1 min-w-0">
              {running.project && <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{running.project}</p>}
              {running.description && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{running.description}</p>}
            </div>
            <span className="text-2xl font-mono font-semibold tabular-nums flex-shrink-0"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {fmtDuration(elapsed)}
            </span>
            <button onClick={() => stop.mutate()}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                    style={{ background: 'var(--red)', color: 'white' }}>
              <Square size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Projekt" value={project} onChange={e => setProject(e.target.value)} className="w-36 flex-shrink-0" />
              <Input placeholder="Was arbeitest du?" value={description} onChange={e => setDesc(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && start.mutate()} className="flex-1" />
              <button onClick={() => start.mutate()}
                      className="w-12 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                      style={{ background: 'var(--green)', color: 'white' }}>
                <Play size={18} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* By project this week */}
      {summary && summary.byProject.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Diese Woche nach Projekt</p>
          <div className="space-y-2">
            {summary.byProject.map(p => {
              const pct = summary.weekS > 0 ? (p.total_s / summary.weekS) * 100 : 0
              return (
                <div key={p.project} className="px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.project || 'Ohne Projekt'}</span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{fmtDuration(p.total_s)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Entry log */}
      {entries.length === 0 && !isRunning && (
        <EmptyState icon={<Clock size={22} />} title="Noch keine Einträge" description="Starte einen Timer um deine Zeit zu erfassen." />
      )}

      <div className="space-y-4">
        {Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dayEntries]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {fmtDate(date + 'T00:00:00')}
                </p>
                <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {fmtDuration(dayEntries.reduce((sum, e) => sum + (e.duration_s ?? 0), 0))}
                </p>
              </div>
              <div className="space-y-1.5">
                {dayEntries.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl group"
                       style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    {e.project && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg flex-shrink-0"
                            style={{ background: 'rgba(10,132,255,0.1)', color: 'var(--accent)' }}>
                        <Briefcase size={10} />{e.project}
                      </span>
                    )}
                    <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                      {e.description || 'Ohne Beschreibung'}
                    </span>
                    <span className="text-xs tabular-nums flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {fmtTime(e.started_at)}–{e.stopped_at ? fmtTime(e.stopped_at) : '…'}
                    </span>
                    {e.duration_s != null && (
                      <span className="text-xs font-medium tabular-nums flex-shrink-0"
                            style={{ color: 'var(--text-primary)', minWidth: 40, textAlign: 'right' }}>
                        {fmtDuration(e.duration_s)}
                      </span>
                    )}
                    <button onClick={() => del.mutate(e.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 transition-all"
                            style={{ color: 'var(--red)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
