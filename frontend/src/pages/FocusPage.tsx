import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Play, Pause, RotateCcw, Coffee, Brain, Flame } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { endpoints } from '../api/client'

type Phase = 'focus' | 'break' | 'long'

const PRESETS = {
  focus: { label: 'Fokus',       duration: 25 * 60, color: 'var(--accent)',  icon: Brain },
  break: { label: 'Pause',       duration:  5 * 60, color: 'var(--green-fg)', icon: Coffee },
  long:  { label: 'Lange Pause', duration: 15 * 60, color: 'var(--yellow-fg)', icon: Coffee },
}

interface FocusStats {
  today_count:   number
  today_seconds: number
  week_count:    number
  week_seconds:  number
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtMin(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function FocusPage() {
  const qc = useQueryClient()
  const [phase, setPhase]   = useState<Phase>('focus')
  const [timeLeft, setTimeLeft] = useState(PRESETS.focus.duration)
  const [running, setRunning]   = useState(false)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const elapsedRef   = useRef<number>(0)

  const { data: stats } = useQuery<FocusStats>({
    queryKey: ['focusStats'],
    queryFn: () => endpoints.focusStats().then(r => r.data),
    staleTime: 60_000,
  })

  const preset = PRESETS[phase]
  const mins   = Math.floor(timeLeft / 60)
  const secs   = timeLeft % 60
  const pct    = 1 - timeLeft / preset.duration

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
  }, [])

  const finish = useCallback(() => {
    stop()
    if (phase === 'focus') {
      // Persist the session
      endpoints.saveFocusSession(PRESETS.focus.duration)
        .then(() => qc.invalidateQueries({ queryKey: ['focusStats'] }))
        .catch(() => {})

      const newSessions = (stats?.today_count ?? 0) + 1
      if (newSessions % 4 === 0) {
        setPhase('long'); setTimeLeft(PRESETS.long.duration)
      } else {
        setPhase('break'); setTimeLeft(PRESETS.break.duration)
      }
    } else {
      setPhase('focus'); setTimeLeft(PRESETS.focus.duration)
    }
    elapsedRef.current = 0
    if (Notification.permission === 'granted') {
      new Notification(phase === 'focus' ? 'Fokus-Session beendet! 🎉' : 'Pause vorbei — weitermachen!', {
        body: phase === 'focus' ? 'Zeit für eine Pause.' : 'Nächste Fokus-Session startet.',
        icon: '/icon-192.png',
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
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, finish, preset.duration])

  function switchPhase(p: Phase) {
    stop(); setPhase(p); setTimeLeft(PRESETS[p].duration); elapsedRef.current = 0
  }
  function reset() {
    stop(); setTimeLeft(preset.duration); elapsedRef.current = 0
  }
  function toggle() {
    if (!running && Notification.permission === 'default') Notification.requestPermission()
    setRunning(r => !r)
  }

  const R    = 88
  const circ = 2 * Math.PI * R

  return (
    <div className="page-root" style={{ maxWidth: 520 }}>
      <PageHeader title="Fokus" subtitle="Pomodoro-Timer für tiefe Arbeit." />

      {/* Phase selector */}
      <div className="flex gap-2 mb-8">
        {(Object.keys(PRESETS) as Phase[]).map(p => {
          const Ico = PRESETS[p].icon
          return (
            <button key={p} onClick={() => switchPhase(p)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={phase === p
                      ? { background: `color-mix(in srgb, ${PRESETS[p].color} 15%, transparent)`, color: PRESETS[p].color }
                      : { color: 'var(--text-muted)' }}>
              <Ico size={14} />{PRESETS[p].label}
            </button>
          )
        })}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-8 mb-8">
        <div className="relative" style={{ width: 220, height: 220 }}>
          <svg width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="110" cy="110" r={R} fill="none" strokeWidth="6"
                    stroke="rgba(255,255,255,0.06)" />
            <circle cx="110" cy="110" r={R} fill="none" strokeWidth="6"
                    stroke={preset.color}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - pct)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono font-semibold tabular-nums"
                  style={{ fontSize: 52, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {pad(mins)}:{pad(secs)}
            </span>
            <span className="text-sm mt-1" style={{ color: preset.color }}>{preset.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button onClick={reset} className="p-3 rounded-xl transition-all active:scale-95"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <RotateCcw size={18} />
          </button>
          <button onClick={toggle}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                  style={{ background: preset.color, color: '#000', boxShadow: `0 4px 20px color-mix(in srgb, ${preset.color} 40%, transparent)` }}>
            {running ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <div className="w-12 h-12" />
        </div>
      </div>

      {/* Stats — today + week */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-4 rounded-2xl flex items-center gap-3"
             style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <Flame size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {stats?.today_count ?? 0}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sessions heute</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl flex items-center gap-3"
             style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <Brain size={18} style={{ color: 'var(--green-fg)' }} />
          <div>
            <p className="text-xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {fmtMin(stats?.today_seconds ?? 0)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Fokuszeit heute</p>
          </div>
        </div>
      </div>

      {stats && (stats.week_count > 0) && (
        <div className="p-3 rounded-2xl flex items-center justify-between mb-4"
             style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Diese Woche</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {stats.week_count} Sessions · {fmtMin(stats.week_seconds)}
          </span>
        </div>
      )}

      {/* Tips */}
      {!running && timeLeft === preset.duration && (
        <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            {phase === 'focus' ? 'Für maximale Konzentration:' : 'Für eine gute Pause:'}
          </p>
          <ul className="space-y-1">
            {(phase === 'focus'
              ? ['Handy auf stumm stellen', 'Klares Ziel für diese Session', 'Nichts anderes geöffnet lassen']
              : ['Aufstehen und bewegen', 'Frische Luft oder kurz dehnen', 'Kein Social Media']
            ).map((t, i) => (
              <li key={i} className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: preset.color }}>·</span> {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
