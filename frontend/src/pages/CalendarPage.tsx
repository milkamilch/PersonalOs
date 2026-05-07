import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CheckSquare, Heart, Dumbbell, Plus, X, Pencil, Clock } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Todo, Habit, Workout, CalendarEvent } from '../api/types'
import PageHeader from '../components/PageHeader'

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function startOfMonth(y: number, m: number) { return new Date(y, m, 1) }
function daysInMonth(y: number, m: number)  { return new Date(y, m + 1, 0).getDate() }

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const EVENT_COLORS = [
  '#0a84ff', '#30d158', '#ff453a', '#ff9f0a', '#bf5af2', '#ff375f', '#40c8e0',
]

interface EventForm {
  title: string
  start_time: string
  end_time: string
  notes: string
  color: string
}

const emptyForm = (): EventForm => ({
  title: '', start_time: '', end_time: '', notes: '', color: '#0a84ff',
})

export default function CalendarPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string>(isoDate(now))

  // Event modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState<EventForm>(emptyForm())

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
  const { data: calEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['calendarEvents'],
    queryFn: () => endpoints.calendarEvents().then(r => r.data),
  })

  const createEvent = useMutation({
    mutationFn: (b: object) => endpoints.createCalendarEvent(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendarEvents'] }); closeModal() },
  })
  const updateEvent = useMutation({
    mutationFn: ({ id, b }: { id: number; b: object }) => endpoints.updateCalendarEvent(id, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendarEvents'] }); closeModal() },
  })
  const deleteEvent = useMutation({
    mutationFn: (id: number) => endpoints.deleteCalendarEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendarEvents'] }),
  })

  function openCreate() {
    setEditingEvent(null)
    setForm(emptyForm())
    setModalOpen(true)
  }
  function openEdit(ev: CalendarEvent) {
    setEditingEvent(ev)
    setForm({
      title: ev.title,
      start_time: ev.start_time ?? '',
      end_time: ev.end_time ?? '',
      notes: ev.notes,
      color: ev.color,
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditingEvent(null); setForm(emptyForm()) }

  function submit() {
    if (!form.title.trim()) return
    const payload = {
      title: form.title.trim(),
      event_date: selected,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      notes: form.notes,
      color: form.color,
    }
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, b: payload })
    } else {
      createEvent.mutate(payload)
    }
  }

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const days     = daysInMonth(year, month)
  const firstDay = startOfMonth(year, month).getDay()
  const startPad = (firstDay + 6) % 7
  const today    = isoDate(now)

  const workoutDates = new Set(workouts.map(w => w.workout_date?.slice(0, 10)))
  const eventsByDate = calEvents.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    ;(acc[e.event_date] ??= []).push(e)
    return acc
  }, {})

  function dotsFor(dateStr: string) {
    const dots: { color: string; key: string }[] = []
    if (workoutDates.has(dateStr)) dots.push({ color: 'var(--green)', key: 'workout' })
    if (eventsByDate[dateStr]?.length) dots.push({ color: 'var(--accent)', key: 'event' })
    return dots
  }

  const selTodos    = todos.filter(t => t.createdAt?.slice(0, 10) === selected)
  const selWorkouts = workouts.filter(w => w.workout_date?.slice(0, 10) === selected)
  const selEvents   = eventsByDate[selected] ?? []
  const isToday     = selected === today

  return (
    <div className="page-root" style={{ maxWidth: 680 }}>
      <PageHeader title="Kalender" subtitle="Todos, Habits, Workouts und Termine." />

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
        <div className="grid grid-cols-7">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {[...Array(startPad)].map((_, i) => <div key={`pad-${i}`} className="h-12" />)}
          {[...Array(days)].map((_, i) => {
            const day     = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isT     = dateStr === today
            const isSel   = dateStr === selected
            const dots    = dotsFor(dateStr)
            return (
              <button key={dateStr} onClick={() => setSelected(dateStr)}
                      className="h-12 flex flex-col items-center justify-center gap-0.5 transition-all"
                      style={isSel ? { background: 'color-mix(in srgb, var(--accent) 15%, transparent)' } : {}}>
                <span className="text-sm tabular-nums font-medium flex items-center justify-center w-7 h-7 rounded-full transition-all"
                      style={{
                        color: isT ? '#fff' : isSel ? 'var(--accent)' : 'var(--text-secondary)',
                        background: isT ? 'var(--accent)' : 'transparent',
                        fontWeight: isT ? 700 : 400,
                      }}>
                  {day}
                </span>
                {dots.length > 0 && (
                  <div className="flex gap-0.5">
                    {dots.map(d => <div key={d.key} className="w-1 h-1 rounded-full" style={{ background: d.color }} />)}
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
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {new Date(selected + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            {isToday && <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>Heute</span>}
          </p>
          <button onClick={openCreate}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                  style={{ background: 'var(--accent)', color: '#000' }}>
            <Plus size={12} /> Termin
          </button>
        </div>

        {/* Calendar Events */}
        {selEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={12} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Termine</span>
            </div>
            <div className="space-y-1.5">
              {selEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-2 px-3 py-2.5 rounded-xl group"
                     style={{ background: `${ev.color}12`, border: `1px solid ${ev.color}30` }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                    {(ev.start_time || ev.end_time) && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}
                      </p>
                    )}
                    {ev.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ev.notes}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(ev)} className="p-1 rounded-lg transition-all hover:opacity-70">
                      <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button onClick={() => deleteEvent.mutate(ev.id)} className="p-1 rounded-lg transition-all hover:opacity-70">
                      <X size={12} style={{ color: '#ff453a' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <span className="text-xs flex-1 truncate"
                        style={{ color: h.done_today ? 'var(--text-muted)' : 'var(--text-secondary)',
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

        {selEvents.length === 0 && selWorkouts.length === 0 && selTodos.length === 0 && !isToday && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Keine Einträge für diesen Tag
          </p>
        )}
      </div>

      {/* Event modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)' }}
             onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingEvent ? 'Termin bearbeiten' : 'Neuer Termin'}
              </p>
              <button onClick={closeModal} className="p-1.5 rounded-xl transition-all hover:opacity-70">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(selected + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            <input
              type="text"
              placeholder="Titel *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              autoFocus
            />

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Von</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Bis</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
            </div>

            <input
              type="text"
              placeholder="Notiz (optional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />

            <div>
              <label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Farbe</label>
              <div className="flex gap-2">
                {EVENT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                          className="w-7 h-7 rounded-full transition-all"
                          style={{
                            background: c,
                            outline: form.color === c ? `2px solid ${c}` : 'none',
                            outlineOffset: 2,
                            opacity: form.color === c ? 1 : 0.5,
                          }} />
                ))}
              </div>
            </div>

            <button
              onClick={submit}
              disabled={!form.title.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#000' }}>
              {editingEvent ? 'Speichern' : 'Termin hinzufügen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
