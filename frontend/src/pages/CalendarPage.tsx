import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CheckSquare, Heart, Dumbbell } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Todo, Habit, Workout } from '../api/types'
import PageHeader from '../components/PageHeader'

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfMonth(y: number, m: number) { return new Date(y, m, 1) }
function daysInMonth(y: number, m: number)  { return new Date(y, m + 1, 0).getDate() }

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function CalendarPage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string>(isoDate(now))

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: () => endpoints.todos().then(r => r.data),
  })
  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: () => endpoints.habits().then(r => r.data),
  })
  const { data: workouts = [] } = useQuery<Workout[]>({
    queryKey: ['workouts'],
    queryFn: () => endpoints.workouts(90).then(r => r.data),
  })

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const days       = daysInMonth(year, month)
  const firstDay   = startOfMonth(year, month).getDay() // 0=Sun
  const startPad   = (firstDay + 6) % 7 // convert to Mon=0
  const today      = isoDate(now)

  // Build dot sets per date
  const workoutDates = new Set(workouts.map(w => w.workout_date?.slice(0, 10)))

  function dotsFor(dateStr: string) {
    const dots: { color: string; key: string }[] = []
    if (workoutDates.has(dateStr)) dots.push({ color: 'var(--green)', key: 'workout' })
    return dots
  }

  // Selected day detail
  const selTodos    = todos.filter(t => t.createdAt?.slice(0, 10) === selected)
  const selWorkouts = workouts.filter(w => w.workout_date?.slice(0, 10) === selected)
  const isToday     = selected === today

  return (
    <div className="page-root" style={{ maxWidth: 680 }}>
      <PageHeader title="Kalender" subtitle="Todos, Habits und Workouts im Überblick." />

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-2 rounded-xl transition-all active:scale-95"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {new Date(year, month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={next} className="p-2 rounded-xl transition-all active:scale-95"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden mb-4"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* padding */}
          {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} className="h-12" />)}
          {[...Array(days)].map((_, i) => {
            const day     = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = dateStr === today
            const isSel   = dateStr === selected
            const dots    = dotsFor(dateStr)
            return (
              <button key={dateStr} onClick={() => setSelected(dateStr)}
                      className="h-12 flex flex-col items-center justify-center gap-0.5 transition-all relative"
                      style={isSel
                        ? { background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }
                        : {}}>
                <span className="text-sm tabular-nums font-medium flex items-center justify-center w-7 h-7 rounded-full transition-all"
                      style={{
                        color: isToday ? '#fff' : isSel ? 'var(--accent)' : 'var(--text-secondary)',
                        background: isToday ? 'var(--accent)' : 'transparent',
                        fontWeight: isToday ? 700 : 400,
                      }}>
                  {day}
                </span>
                {dots.length > 0 && (
                  <div className="flex gap-0.5">
                    {dots.map(d => (
                      <div key={d.key} className="w-1 h-1 rounded-full" style={{ background: d.color }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail */}
      <div className="rounded-2xl p-4 space-y-3"
           style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {new Date(selected + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          {isToday && <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>Heute</span>}
        </p>

        {selWorkouts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Dumbbell size={12} style={{ color: 'var(--green)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--green)' }}>Workout</span>
            </div>
            {selWorkouts.map(w => (
              <div key={w.id} className="text-sm px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>{w.name}</p>
                {w.exercises.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {w.exercises.map(e => e.name).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {isToday && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Heart size={12} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Habits heute
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {habits.map(h => (
                <div key={h.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                     style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-xs">{h.icon}</span>
                  <span className="text-xs flex-1 truncate" style={{ color: h.done_today ? 'var(--text-muted)' : 'var(--text-secondary)',
                                                                       textDecoration: h.done_today ? 'line-through' : 'none' }}>
                    {h.name}
                  </span>
                  {h.done_today === 1 && <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {selTodos.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CheckSquare size={12} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Todos</span>
            </div>
            {selTodos.map(t => (
              <div key={t.id} className="text-sm px-3 py-1.5 rounded-xl flex items-center gap-2"
                   style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ color: t.done ? 'var(--green)' : 'var(--text-muted)' }}>{t.done ? '✓' : '○'}</span>
                <span style={{ color: t.done ? 'var(--text-muted)' : 'var(--text-secondary)',
                               textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
              </div>
            ))}
          </div>
        )}

        {selWorkouts.length === 0 && selTodos.length === 0 && !isToday && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Keine Einträge für diesen Tag
          </p>
        )}
      </div>
    </div>
  )
}
