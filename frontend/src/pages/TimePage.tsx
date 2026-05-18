import PageHeader from '../components/PageHeader'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Trash2 } from 'lucide-react'
import { endpoints } from '../api/client'
import type { TimeEntry, TimeSummary } from '../api/types'

function fmtDuration(s: number) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); if (h > 0) return `${h}h ${m}m`; return `${m}m` }
function fmtTime(iso: string) { try { return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
function fmtDate(iso: string) {
  try {
    const d = new Date(iso); const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Heute'
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Gestern'
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
  } catch { return '' }
}


export default function TimePage() {
  const qc = useQueryClient()
  const [project, setProject] = useState('')
  const [description, setDesc] = useState('')
  const [elapsed, setElapsed] = useState(0)

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

  useEffect(() => {
    if (!running?.running) { setElapsed(0); return }
    const update = () => setElapsed(Math.floor((Date.now() - new Date(running.started_at).getTime()) / 1000))
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

  const grouped = entries.reduce<Record<string, TimeEntry[]>>((acc, e) => {
    const date = e.started_at.slice(0, 10)
    ;(acc[date] ||= []).push(e)
    return acc
  }, {})

  const maxH = summary ? Math.max(...(summary.byProject?.map(p => p.total_s / 3600) ?? [1]), 1) : 1

  return (
    <div className="content">
      <PageHeader
        eyebrow={`Diese Woche · ${fmtDuration(summary?.weekS ?? 0)}`}
        title="Zeiterfassung"
        sub="Du erfährst, was dir wichtig ist, wenn du es misst."
      />

      <div className="bento" style={{ marginBottom: 16 }}>
        {isRunning ? (
          <div className="col-8 card" style={{ background: 'var(--fg)', color: 'var(--bg)', border: 0 }}>
            <div className="card-b" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, background: '#2F8F4E', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 4 }}>Läuft</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{running.description || 'Kein Titel'}</div>
                {running.project && <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 2 }}>{running.project}</div>}
              </div>
              <div className="display" style={{ fontSize: 34, fontWeight: 500, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {fmtDuration(elapsed)}
              </div>
              <button className="btn" onClick={() => stop.mutate()} style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--bg)', border: 'none' }}>
                <Square size={14} /> Stop
              </button>
            </div>
          </div>
        ) : (
          <div className="col-8 card">
            <div className="card-b" style={{ display: 'flex', gap: 8 }}>
              <input value={project} onChange={e => setProject(e.target.value)} placeholder="Projekt"
                style={{ width: 130, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)', flexShrink: 0 }} />
              <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Was arbeitest du?"
                onKeyDown={e => e.key === 'Enter' && start.mutate()}
                style={{ flex: 1, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
              <button className="btn primary" onClick={() => start.mutate()}><Play size={14} /> Start</button>
            </div>
          </div>
        )}
        <div className="col-4 stat">
          <div className="l">Heute</div>
          <div className="v">{fmtDuration(summary?.todayS ?? 0)}</div>
          <div className="delta">{summary?.byProject?.length ?? 0} Projekte</div>
        </div>
      </div>

      <div className="bento">
        <div className="col-7 card">
          <div className="card-h"><span className="accent-dot" /><span className="title">Einträge</span></div>
          <div className="card-b" style={{ padding: 0 }}>
            {entries.length === 0 && !isRunning && <div className="empty" style={{ padding: 60 }}>Noch keine Zeiteinträge.</div>}
            {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).flatMap(([date, dayEntries]) =>
              dayEntries.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderTop: (i > 0 || date !== Object.keys(grouped).sort((a, b) => b.localeCompare(a))[0]) ? '1px solid var(--line)' : 'none' }}>
                  <span style={{ width: 56, fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--fg-4)', flexShrink: 0 }}>{i === 0 ? fmtDate(date + 'T00:00:00') : ''}</span>
                  {e.project && <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--accent)', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{e.description || 'Ohne Beschreibung'}</div>
                    {e.project && <div style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{e.project}</div>}
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono', flexShrink: 0 }}>{fmtTime(e.started_at)}–{e.stopped_at ? fmtTime(e.stopped_at) : '…'}</span>
                  {e.duration_s != null && <span className="display" style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'right', flexShrink: 0 }}>{fmtDuration(e.duration_s)}</span>}
                  <button onClick={() => del.mutate(e.id)} style={{ color: 'var(--fg-5)', cursor: 'pointer' }}
                    onMouseEnter={el => (el.currentTarget.style.color = 'var(--rose)')}
                    onMouseLeave={el => (el.currentTarget.style.color = 'var(--fg-5)')}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-5 card">
          <div className="card-h"><span className="accent-dot" /><span className="title">Verteilung · Woche</span></div>
          <div className="card-b">
            {(summary?.byProject ?? []).length === 0 && <div className="empty">Keine Daten diese Woche.</div>}
            {(summary?.byProject ?? []).map((p, i) => (
              <div key={p.project} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{p.project || 'Ohne Projekt'}</span>
                  <span className="display" style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtDuration(p.total_s)}</span>
                </div>
                <div className="bar thin"><div className="fill" style={{ width: `${(p.total_s / 3600 / maxH) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
