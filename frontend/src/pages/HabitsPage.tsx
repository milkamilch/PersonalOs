import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Flame, Check, TrendingUp } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Habit, HabitWeekDay } from '../api/types'


export default function HabitsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ['habits'], queryFn: () => endpoints.habits().then(r => r.data) })
  const { data: weekData = [] } = useQuery<HabitWeekDay[]>({ queryKey: ['habitWeek'], queryFn: () => endpoints.habitWeek().then(r => r.data) })
  const { data: heatmap = [] } = useQuery<{ date: string; count: number; total: number }[]>({
    queryKey: ['habitHeatmap'], queryFn: () => endpoints.habitHeatmap(84).then(r => r.data),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => endpoints.toggleHabit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['habitWeek'] })
      qc.invalidateQueries({ queryKey: ['habitHeatmap'] })
    },
  })
  const create = useMutation({
    mutationFn: () => endpoints.createHabit({ name: newName, icon: '✅', color: '#1C6BFF' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); setNewName(''); setShowAdd(false) },
  })
  const del = useMutation({ mutationFn: (id: number) => endpoints.deleteHabit(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }) })

  const done  = habits.filter(h => h.done_today === 1).length
  const total = habits.length
  const DAYS  = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  const todayDow = (new Date().getDay() + 6) % 7

  const heatCells = Array.from({ length: 84 }, (_, i) => {
    const entry = heatmap[Math.max(0, heatmap.length - 84) + i]
    if (!entry || !entry.total) return 0
    const r = entry.count / entry.total
    return r === 0 ? 0 : r < 0.4 ? 1 : r < 0.7 ? 2 : r < 1 ? 3 : 4
  })

  const weekAvg = weekData.length > 0
    ? Math.round(weekData.reduce((s, d) => s + (d.total > 0 ? d.done / d.total : 0), 0) / weekData.length * 100)
    : 0

  return (
    <div className="content">
      <PageHeader
        eyebrow="Disziplin"
        title="Gewohnheiten"
        sub="Was du jeden Tag tust, wirst du."
        action={<button className="btn primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Neue Gewohnheit</button>}
      />

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-b" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) create.mutate(); if (e.key === 'Escape') setShowAdd(false) }}
              placeholder="Name der Gewohnheit…"
              style={{ flex: 1, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <button className="btn primary" onClick={() => newName.trim() && create.mutate()}>Anlegen</button>
            <button className="btn ghost" onClick={() => setShowAdd(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div className="bento" style={{ marginBottom: 16 }}>
        <div className="col-3 stat">
          <div className="l">Heute erledigt</div>
          <div className="v" style={{ color: done === total && total > 0 ? 'var(--green)' : 'var(--accent)' }}>{done}<span className="unit">/{total}</span></div>
          <div className={`delta ${done === total && total > 0 ? 'up' : ''}`}>
            {done === total && total > 0 ? <><TrendingUp size={12} /> Alle erledigt</> : `${total - done} ausstehend`}
          </div>
        </div>
        <div className="col-3 stat">
          <div className="l">Wochen-Schnitt</div>
          <div className="v">{weekAvg}<span className="unit">%</span></div>
          <div className="delta">letzte 7 Tage</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Gesamt Check-ins</div>
          <div className="v">{habits.reduce((s, h) => s + h.total_done, 0)}</div>
          <div className="delta">alle Habits</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Aktive Habits</div>
          <div className="v">{total}</div>
          <div className="delta">{habits.length > 0 ? `Top: ${habits.reduce((m, h) => h.total_done > m.total_done ? h : m, habits[0]).name.slice(0, 14)}` : '–'}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <span className="accent-dot" />
          <span className="title">Diese Woche</span>
          <div className="spacer" />
          <span className="meta">KW {Math.ceil((((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)}</span>
        </div>
        <div className="card-b" style={{ overflowX: 'auto' }}>
          {habits.length === 0
            ? <div className="empty">Noch keine Gewohnheiten. Lege die erste an.</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 0' }}>Gewohnheit</th>
                    {DAYS.map((d, i) => (
                      <th key={d} style={{ width: 40, textAlign: 'center', fontWeight: 500, fontSize: 11, color: i === todayDow ? 'var(--accent)' : 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 0' }}>{d}</th>
                    ))}
                    <th style={{ width: 60, textAlign: 'right', fontWeight: 500, fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 0' }}>Streak</th>
                    <th style={{ width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {habits.map(habit => (
                    <tr key={habit.id} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: habit.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{habit.icon} {habit.name}</span>
                        </div>
                      </td>
                      {DAYS.map((_, i) => {
                        const isToday = i === todayDow
                        const filled = isToday ? !!habit.done_today : false
                        return (
                          <td key={i} style={{ textAlign: 'center', padding: '10px 0' }}>
                            <button onClick={() => isToday && toggle.mutate(habit.id)} style={{
                              width: 22, height: 22, borderRadius: 6,
                              background: filled ? habit.color : 'var(--surface-sunk)',
                              border: isToday && !filled ? `1.5px dashed ${habit.color}` : '1.5px solid transparent',
                              display: 'inline-grid', placeItems: 'center',
                              cursor: isToday ? 'pointer' : 'default', opacity: i > todayDow ? 0.3 : 1,
                            }}>
                              {filled && <Check size={12} color="white" />}
                            </button>
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'right', padding: '10px 0', fontSize: 12.5, color: 'var(--fg-2)' }}>
                        {habit.total_done > 0
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Flame size={11} color="var(--amber)" /> {habit.total_done}</span>
                          : <span style={{ color: 'var(--fg-4)' }}>—</span>}
                      </td>
                      <td>
                        <button onClick={() => del.mutate(habit.id)} style={{ color: 'var(--fg-5)', padding: 4, fontSize: 11 }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="accent-dot" />
          <span className="title">Konstanz · 12 Wochen</span>
          <div className="spacer" />
          <span className="meta">{weekAvg > 0 ? `${weekAvg} % Quote` : '–'}</span>
        </div>
        <div className="card-b">
          <div className="heat" style={{ gridAutoColumns: '14px', gridTemplateRows: 'repeat(7, 14px)' }}>
            {heatCells.map((v, i) => <div key={i} className={`cell ${v ? `l${v}` : ''}`} style={{ width: 14, height: 14 }} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--fg-4)' }}>
            <span>vor 12 Wochen</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              weniger
              <span style={{ display: 'inline-flex', gap: 2 }}>
                {[0, 1, 2, 3, 4].map(l => <span key={l} className={`cell ${l ? `l${l}` : ''}`} style={{ width: 10, height: 10 }} />)}
              </span>
              mehr
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
