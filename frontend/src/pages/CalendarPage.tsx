import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Dumbbell, Heart, Pencil, Plus, X } from 'lucide-react'
import { endpoints } from '../api/client'
import type { CalendarEvent, Habit, Todo, Workout } from '../api/types'

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }
function daysInMonthFn(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const EVENT_COLORS = ['#1C6BFF', '#2F8F4E', '#C8344A', '#C58A00', '#8E5BFF', '#0FA3A6']

interface EventForm { title: string; start_time: string; end_time: string; notes: string; color: string }
const emptyForm = (): EventForm => ({ title: '', start_time: '', end_time: '', notes: '', color: '#1C6BFF' })


export default function CalendarPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string>(isoDate(now))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState<EventForm>(emptyForm())

  const { data: todos = [] } = useQuery<Todo[]>({ queryKey: ['todos'], queryFn: () => endpoints.todos().then(r => r.data) })
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ['habits'], queryFn: () => endpoints.habits().then(r => r.data) })
  const { data: workouts = [] } = useQuery<Workout[]>({ queryKey: ['workouts'], queryFn: () => endpoints.workouts(90).then(r => r.data) })
  const { data: calEvents = [] } = useQuery<CalendarEvent[]>({ queryKey: ['calendarEvents'], queryFn: () => endpoints.calendarEvents().then(r => r.data) })

  const createEvent = useMutation({ mutationFn: (b: object) => endpoints.createCalendarEvent(b), onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendarEvents'] }); closeModal() } })
  const updateEvent = useMutation({ mutationFn: ({ id, b }: { id: number; b: object }) => endpoints.updateCalendarEvent(id, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendarEvents'] }); closeModal() } })
  const deleteEvent = useMutation({ mutationFn: (id: number) => endpoints.deleteCalendarEvent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['calendarEvents'] }) })

  function openCreate() { setEditingEvent(null); setForm(emptyForm()); setModalOpen(true) }
  function openEdit(ev: CalendarEvent) { setEditingEvent(ev); setForm({ title: ev.title, start_time: ev.start_time ?? '', end_time: ev.end_time ?? '', notes: ev.notes, color: ev.color }); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditingEvent(null); setForm(emptyForm()) }
  function submit() {
    if (!form.title.trim()) return
    const payload = { title: form.title.trim(), event_date: selected, start_time: form.start_time || null, end_time: form.end_time || null, notes: form.notes, color: form.color }
    editingEvent ? updateEvent.mutate({ id: editingEvent.id, b: payload }) : createEvent.mutate(payload)
  }

  function prev() { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  function next() { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const days = daysInMonthFn(year, month)
  const startPad = (new Date(year, month, 1).getDay() + 6) % 7
  const today = isoDate(now)
  const monthName = new Date(year, month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const workoutDates = new Set(workouts.map(w => w.workout_date?.slice(0, 10)))
  const eventsByDate = calEvents.reduce<Record<string, CalendarEvent[]>>((acc, e) => { (acc[e.event_date] ??= []).push(e); return acc }, {})

  const prevDays = daysInMonthFn(year, month === 0 ? 11 : month - 1)
  const cells: { day: number; muted: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = i - startPad + 1
    if (d < 1) cells.push({ day: prevDays + d, muted: true })
    else if (d > days) cells.push({ day: d - days, muted: true })
    else cells.push({ day: d, muted: false })
  }

  const selEvents = eventsByDate[selected] ?? []
  const selWorkouts = workouts.filter(w => w.workout_date?.slice(0, 10) === selected)
  const selTodos = todos.filter(t => t.createdAt?.slice(0, 10) === selected)
  const isToday = selected === today
  const selDate = new Date(selected + 'T12:00:00')

  const inputStyle = { background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)', width: '100%' }

  return (
    <div className="content">
      <PageHeader
        eyebrow={monthName}
        title="Kalender"
        sub="Ein Monat ist nur ein Vorschlag der Zeit. Trag ihn ein."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={prev}><ChevronLeft size={14} /></button>
            <button className="btn" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(isoDate(now)) }}>Heute</button>
            <button className="btn ghost" onClick={next}><ChevronRight size={14} /></button>
            <button className="btn primary" onClick={openCreate}><Plus size={14} /> Termin</button>
          </div>
        }
      />

      <div className="bento">
        <div className="col-8">
          <div className="card">
            <div className="card-h">
              <span className="accent-dot" />
              <span className="title">{monthName}</span>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--line)' }}>
                {WEEKDAYS.map((d, i) => (
                  <div key={d} style={{ padding: '10px 12px', fontSize: 10.5, color: i >= 5 ? 'var(--fg-4)' : 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(88px, 1fr)' }}>
                {cells.map((cell, i) => {
                  const isWe = i % 7 >= 5
                  const dateStr = cell.muted ? '' : `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                  const isT = dateStr === today
                  const isSel = dateStr === selected
                  const evs = dateStr ? (eventsByDate[dateStr] ?? []) : []
                  const hasWorkout = dateStr ? workoutDates.has(dateStr) : false
                  return (
                    <button key={i} onClick={() => !cell.muted && dateStr && setSelected(dateStr)}
                      style={{ textAlign: 'left', padding: '8px 10px',
                        borderRight: i % 7 < 6 ? '1px solid var(--line)' : 'none',
                        borderBottom: i < 35 ? '1px solid var(--line)' : 'none',
                        background: isSel ? 'var(--accent-soft)' : isWe && !cell.muted ? 'var(--surface-sunk)' : 'var(--surface)',
                        color: cell.muted ? 'var(--fg-5)' : 'var(--fg)',
                        cursor: cell.muted ? 'default' : 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: 'Inter Tight', fontSize: 12.5, fontWeight: isT ? 600 : 500, fontVariantNumeric: 'tabular-nums',
                          color: isT ? 'white' : isSel ? 'var(--accent)' : 'inherit',
                          background: isT ? 'var(--accent)' : 'transparent',
                          width: isT ? 22 : 'auto', height: isT ? 22 : 'auto',
                          borderRadius: isT ? 99 : 0, display: 'inline-grid', placeItems: 'center',
                          marginLeft: isT ? -4 : 0 }}>
                          {cell.day}
                        </span>
                        {hasWorkout && <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--green)', flexShrink: 0 }} />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {evs.slice(0, 2).map((ev, j) => (
                          <div key={j} style={{ fontSize: 10, lineHeight: 1.25, padding: '1px 4px', borderRadius: 3,
                            background: `${ev.color}1A`, color: ev.color, fontWeight: 500,
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {ev.title}
                          </div>
                        ))}
                        {evs.length > 2 && <div style={{ fontSize: 10, color: 'var(--fg-4)', paddingLeft: 4 }}>+{evs.length - 2}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-h">
              <span className="accent-dot" />
              <span className="title">
                {selDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' })}
                {isToday && <span className="pill success" style={{ marginLeft: 8, fontSize: 10 }}>Heute</span>}
              </span>
              <div className="spacer" />
              <button className="btn primary" style={{ height: 28, fontSize: 11, padding: '0 10px' }} onClick={openCreate}><Plus size={11} /> Termin</button>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              {selEvents.length === 0 && selWorkouts.length === 0 && selTodos.length === 0 && !isToday && (
                <div className="empty" style={{ padding: 40 }}>Keine Einträge an diesem Tag.</div>
              )}

              {selEvents.map((ev, i) => (
                <div key={ev.id} className="agenda-item" style={{ borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                  <div className="time">{ev.start_time ?? '—'}</div>
                  <div className="bar" style={{ background: ev.color }} />
                  <div className="body">
                    <div className="t">{ev.title}</div>
                    <div className="s">{ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}{ev.notes ? ` · ${ev.notes}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => openEdit(ev)} style={{ padding: 4, color: 'var(--fg-4)', cursor: 'pointer' }}><Pencil size={11} /></button>
                    <button onClick={() => deleteEvent.mutate(ev.id)} style={{ padding: 4, color: 'var(--rose)', cursor: 'pointer' }}><X size={11} /></button>
                  </div>
                </div>
              ))}

              {selWorkouts.map((w, i) => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: (i > 0 || selEvents.length > 0) ? '1px solid var(--line)' : 'none' }}>
                  <Dumbbell size={12} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{w.name}</span>
                </div>
              ))}

              {isToday && habits.slice(0, 6).map((h, i) => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderTop: (i > 0 || selEvents.length > 0 || selWorkouts.length > 0) ? '1px solid var(--line)' : 'none', opacity: h.done_today ? 0.55 : 1 }}>
                  <Heart size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{h.icon} {h.name}</span>
                  {h.done_today === 1 && <span style={{ fontSize: 10, color: 'var(--green)' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><span className="accent-dot" /><span className="title">Kategorien</span></div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { c: '#1C6BFF', n: 'Studium' }, { c: '#2F8F4E', n: 'Sport' },
                { c: '#C58A00', n: 'Termin'  }, { c: '#8E5BFF', n: 'Privat' }, { c: '#C8344A', n: 'Reise' },
              ].map(cat => (
                <div key={cat.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: cat.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 13 }}>{cat.n}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--fg-4)' }}>
                    {calEvents.filter(e => e.color === cat.c).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            <div className="card-h">
              <span className="accent-dot" />
              <span className="title">{editingEvent ? 'Termin bearbeiten' : 'Neuer Termin'}</span>
              <div className="spacer" />
              <button onClick={closeModal} style={{ color: 'var(--fg-4)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>
                {selDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <input placeholder="Titel *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} autoFocus />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)', marginBottom: 4 }}>Von</div>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)', marginBottom: 4 }}>Bis</div>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <input placeholder="Notiz (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginBottom: 8 }}>Farbe</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {EVENT_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                        outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2, opacity: form.color === c ? 1 : 0.5 }} />
                  ))}
                </div>
              </div>
              <button onClick={submit} disabled={!form.title.trim()}
                style={{ width: '100%', padding: 10, borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: 'white', cursor: 'pointer', opacity: form.title.trim() ? 1 : 0.4 }}>
                {editingEvent ? 'Speichern' : 'Termin hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
