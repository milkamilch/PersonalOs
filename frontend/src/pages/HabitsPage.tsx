import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Flame, CheckCircle2, Circle } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Habit, HabitWeekDay } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Input, EmptyState, Card } from '../components/ui'

const COLORS = ['#7c3aed','#4f46e5','#0891b2','#059669','#d97706','#dc2626','#db2777','#6366f1']
const ICONS  = ['🏃','💪','📚','🧘','🥗','💧','😴','🎯','✍️','🎸','🧠','❤️','🌿','🛁','🚴']

interface HeatmapDay { date: string; done: number; total: number }

function heatColor(done: number, total: number): string {
  if (total === 0 || done === 0) return 'rgba(255,255,255,0.04)'
  const pct = done / total
  if (pct >= 1)   return 'rgba(124,58,237,0.85)'
  if (pct >= 0.7) return 'rgba(124,58,237,0.55)'
  if (pct >= 0.4) return 'rgba(124,58,237,0.30)'
  return 'rgba(124,58,237,0.14)'
}

export default function HabitsPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [name,  setName]  = useState('')
  const [icon,  setIcon]  = useState('✓')
  const [color, setColor] = useState('#7c3aed')
  const [hovered, setHovered] = useState<HeatmapDay | null>(null)

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: () => endpoints.habits().then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: week = [] } = useQuery<HabitWeekDay[]>({
    queryKey: ['habitWeek'],
    queryFn: () => endpoints.habitWeek().then(r => r.data),
  })

  const { data: heatmap = [] } = useQuery<HeatmapDay[]>({
    queryKey: ['habitHeatmap'],
    queryFn: () => endpoints.habitHeatmap(120).then(r => r.data),
    staleTime: 5 * 60_000,
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
    mutationFn: () => endpoints.createHabit({ name, icon, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      setName(''); setShowNew(false)
    },
  })

  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteHabit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })

  const todayDone = habits.filter(h => h.done_today === 1).length
  const total     = habits.length

  // Build 17 columns × 7 rows grid (pad to full weeks)
  const padded = [...heatmap]
  while (padded.length % 7 !== 0) padded.unshift({ date: '', done: 0, total: 0 })
  const weeks: HeatmapDay[][] = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

  return (
    <div className="page-root page-medium">
      <PageHeader
        title="Gewohnheiten"
        subtitle={total > 0 ? `${todayDone} / ${total} heute erledigt` : 'Baue Routinen auf, die bleiben.'}
        actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowNew(s => !s)}>Neue Habit</Button>}
      />

      {/* Heatmap */}
      {heatmap.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Letzte 4 Monate
            </p>
            {hovered && hovered.date && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {new Date(hovered.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                {' — '}{hovered.done}/{hovered.total}
              </p>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    onMouseEnter={() => day.date ? setHovered(day) : undefined}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      width: 12, height: 12,
                      borderRadius: 3,
                      background: day.date ? heatColor(day.done, day.total) : 'transparent',
                      cursor: day.date ? 'default' : 'default',
                      transition: 'background 0.1s',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>0%</span>
            {[0, 0.14, 0.30, 0.55, 0.85].map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2,
                background: ['rgba(255,255,255,0.04)','rgba(124,58,237,0.14)','rgba(124,58,237,0.30)','rgba(124,58,237,0.55)','rgba(124,58,237,0.85)'][i] }} />
            ))}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>100%</span>
          </div>
        </Card>
      )}

      {/* Week overview */}
      {week.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Diese Woche
          </p>
          <div className="flex gap-2">
            {week.map((d, i) => {
              const pct  = d.total > 0 ? d.done / d.total : 0
              const day  = new Date(d.date).toLocaleDateString('de-DE', { weekday: 'short' })
              const isToday = d.date === new Date().toISOString().slice(0, 10)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-lg overflow-hidden" style={{ height: 48, background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
                    <div className="absolute bottom-0 w-full rounded-lg transition-all duration-500"
                         style={{ height: `${pct * 100}%`, background: pct === 1 ? 'var(--accent)' : 'rgba(124,58,237,0.4)' }} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
                          style={{ color: pct > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {d.done > 0 ? d.done : ''}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: isToday ? 'var(--accent-fg)' : 'var(--text-muted)', fontWeight: isToday ? 600 : 400 }}>
                    {day}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* New habit form */}
      {showNew && (
        <Card className="mb-6 p-4">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Neue Gewohnheit</p>
          <div className="flex gap-2 mb-3">
            <Input placeholder="Name…" value={name} onChange={e => setName(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && name && create.mutate()} className="flex-1" />
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
                      style={{ background: icon === ic ? 'var(--accent-soft)' : 'rgba(255,255,255,0.04)',
                               border: `1px solid ${icon === ic ? 'var(--accent-fg)' : 'transparent'}` }}>
                {ic}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-4">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                      className="w-6 h-6 rounded-full transition-all"
                      style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" disabled={!name.trim()} loading={create.isPending} onClick={() => create.mutate()}>
              Erstellen
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Abbrechen</Button>
          </div>
        </Card>
      )}

      {/* Habit list */}
      {habits.length === 0 && !showNew && (
        <EmptyState icon={<CheckCircle2 size={22} />} title="Keine Habits"
          description="Starte mit kleinen, täglichen Gewohnheiten." />
      )}

      <div className="space-y-2">
        {habits.map(h => (
          <HabitRow key={h.id} habit={h}
            onToggle={() => toggle.mutate(h.id)}
            onDelete={() => del.mutate(h.id)}
          />
        ))}
      </div>

      {/* Streak motivator */}
      {todayDone === total && total > 0 && (
        <div className="mt-6 p-4 rounded-2xl text-center"
             style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <div className="text-2xl mb-1">🎉</div>
          <p className="text-sm font-semibold" style={{ color: 'var(--accent-fg)' }}>Alle Habits heute erledigt!</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Starke Leistung. Bleib dran.</p>
        </div>
      )}
    </div>
  )
}

function HabitRow({ habit, onToggle, onDelete }: { habit: Habit; onToggle: () => void; onDelete: () => void }) {
  const done = habit.done_today === 1
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl group transition-all duration-150"
         style={{ background: done ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${done ? 'rgba(124,58,237,0.2)' : 'var(--border-subtle)'}` }}>
      <button onClick={onToggle}
              className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-sm transition-all"
              style={{ background: done ? habit.color : 'rgba(255,255,255,0.04)',
                       border: `2px solid ${done ? habit.color : 'var(--border-default)'}` }}>
        {done ? <CheckCircle2 size={14} color="white" /> : <Circle size={14} style={{ color: 'var(--text-muted)' }} />}
      </button>

      <span className="text-lg flex-shrink-0">{habit.icon}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate"
           style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: done ? 'line-through' : 'none' }}>
          {habit.name}
        </p>
        {habit.total_done > 0 && (
          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <Flame size={10} style={{ color: '#fb923c' }} />
            {habit.total_done}× erledigt
          </p>
        )}
      </div>

      <button onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}
