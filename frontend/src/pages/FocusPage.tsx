import PageHeader from '../components/PageHeader'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '../api/client'

type Phase = 'focus' | 'break' | 'long'

const PRESETS: Record<Phase, { label: string; duration: number; color: string }> = {
  focus: { label: 'Fokus',       duration: 25 * 60, color: 'var(--accent)'  },
  break: { label: 'Pause',       duration:  5 * 60, color: '#2F8F4E'        },
  long:  { label: 'Lange Pause', duration: 15 * 60, color: '#C58A00'        },
}

interface FocusStats { today_count: number; today_seconds: number; week_count: number; week_seconds: number }

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtMin(s: number) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m` }


export default function FocusPage() {
  const qc = useQueryClient()
  const [phase, setPhase] = useState<Phase>('focus')
  const [timeLeft, setTimeLeft] = useState(PRESETS.focus.duration)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedRef = useRef<number>(0)

  const { data: stats } = useQuery<FocusStats>({
    queryKey: ['focusStats'],
    queryFn: () => endpoints.focusStats().then(r => r.data),
    staleTime: 60_000,
  })

  const preset = PRESETS[phase]
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const pct = 1 - timeLeft / preset.duration
  const r = 120, c = 2 * Math.PI * r
  const dash = c * (1 - pct)

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
  }, [])

  const finish = useCallback(() => {
    stop()
    if (phase === 'focus') {
      endpoints.saveFocusSession(PRESETS.focus.duration)
        .then(() => qc.invalidateQueries({ queryKey: ['focusStats'] }))
        .catch(() => {})
      const newSessions = (stats?.today_count ?? 0) + 1
      if (newSessions % 4 === 0) { setPhase('long'); setTimeLeft(PRESETS.long.duration) }
      else { setPhase('break'); setTimeLeft(PRESETS.break.duration) }
    } else { setPhase('focus'); setTimeLeft(PRESETS.focus.duration) }
    elapsedRef.current = 0
    if (Notification.permission === 'granted') {
      new Notification(phase === 'focus' ? 'Fokus-Session beendet! 🎉' : 'Pause vorbei — weitermachen!', {
        body: phase === 'focus' ? 'Zeit für eine Pause.' : 'Nächste Fokus-Session startet.',
      })
    }
  }, [phase, stats, stop, qc])

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now() - elapsedRef.current * 1000
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        const remaining = preset.duration - elapsed
        if (remaining <= 0) { finish(); return }
        setTimeLeft(remaining)
        elapsedRef.current = elapsed
      }, 250)
    } else { if (intervalRef.current) clearInterval(intervalRef.current) }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, finish, preset.duration])

  function switchPhase(p: Phase) { stop(); setPhase(p); setTimeLeft(PRESETS[p].duration); elapsedRef.current = 0 }
  function reset() { stop(); setTimeLeft(preset.duration); elapsedRef.current = 0 }
  function toggle() {
    if (!running && Notification.permission === 'default') Notification.requestPermission()
    setRunning(r => !r)
  }

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  return (
    <div className="content">
      <PageHeader
        eyebrow={`${stats?.today_count ?? 0} Sessions heute · ${fmtMin(stats?.today_seconds ?? 0)}`}
        title="Fokus"
        sub="Tiefe entsteht in der Pause vom Lärm."
      />

      <div className="bento">
        <div className="col-7">
          <div className="card">
            <div className="card-h">
              <span className="accent-dot" />
              <span className="title">Timer · {preset.duration / 60} Min</span>
              <div className="spacer" />
              <div style={{ display: 'flex', gap: 6 }}>
                {(Object.keys(PRESETS) as Phase[]).map(p => (
                  <button key={p} onClick={() => switchPhase(p)}
                    style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                      background: phase === p ? PRESETS[p].color : 'var(--surface-sunk)',
                      color: phase === p ? 'white' : 'var(--fg-3)', border: '1px solid var(--line)' }}>
                    {PRESETS[p].duration / 60}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-b" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
              <div style={{ position: 'relative', width: 280, height: 280 }}>
                <svg width="280" height="280" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="140" cy="140" r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth="6" />
                  <circle cx="140" cy="140" r={r} fill="none" stroke={preset.color} strokeWidth="6"
                    strokeDasharray={c} strokeDashoffset={dash} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <div>
                    <div className="display" style={{ fontSize: 64, fontWeight: 500, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {pad(mins)}<span style={{ color: 'var(--fg-4)' }}>:</span>{pad(secs)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>
                      {running ? 'läuft' : timeLeft === preset.duration ? 'bereit' : 'pausiert'}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn" onClick={reset}>Zurücksetzen</button>
                <button className="btn primary" onClick={toggle} style={{ minWidth: 140, background: preset.color }}>
                  {running ? '⏸ Pause' : '▶ Starten'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="bento" style={{ margin: 0, gap: 12 }}>
            <div className="col-6 stat">
              <div className="l">Heute</div>
              <div className="v">{stats?.today_count ?? 0}<span className="unit">×</span></div>
              <div className="delta">{fmtMin(stats?.today_seconds ?? 0)}</div>
            </div>
            <div className="col-6 stat">
              <div className="l">Diese Woche</div>
              <div className="v">{stats?.week_count ?? 0}<span className="unit">×</span></div>
              <div className="delta">{fmtMin(stats?.week_seconds ?? 0)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><span className="accent-dot" /><span className="title">Diese Woche</span></div>
            <div className="card-b">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {weekDays.map((d, i) => {
                  const today = new Date().getDay()
                  const isToday = (today === 0 ? 6 : today - 1) === i
                  return (
                    <div key={d} style={{ textAlign: 'center' }}>
                      <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 6 }}>
                        <div style={{ width: 18, height: isToday ? `${Math.max(20, (stats?.today_count ?? 0) / 8 * 100)}%` : '20%',
                          background: isToday ? preset.color : 'var(--surface-sunk)',
                          border: isToday ? 'none' : '1px solid var(--line)', borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 10.5, color: isToday ? preset.color : 'var(--fg-4)', fontWeight: isToday ? 600 : 500 }}>{d}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
