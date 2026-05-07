import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Dumbbell, X, ChevronDown, ChevronUp, Scale } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Workout, FitnessStats, BodyWeightEntry } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Input, Card, EmptyState, Badge } from '../components/ui'

const QUICK_EXERCISES = ['Bankdrücken','Kniebeuge','Kreuzheben','Klimmzüge','Dips','Schulterdrücken','Rudern','Bizeps Curls','Trizeps','Planke','Laufen','Fahrrad']

export default function FitnessPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [tab, setTab] = useState<'workouts' | 'weight'>('workouts')

  const { data: workouts = [] } = useQuery<Workout[]>({
    queryKey: ['workouts'],
    queryFn: () => endpoints.workouts().then(r => r.data),
  })

  const { data: stats } = useQuery<FitnessStats>({
    queryKey: ['fitnessStats'],
    queryFn: () => endpoints.fitnessStats().then(r => r.data),
  })

  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteWorkout(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workouts'] }); qc.invalidateQueries({ queryKey: ['fitnessStats'] }) },
  })

  return (
    <div className="page-root page-medium">
      <PageHeader
        title="Fitness"
        subtitle="Trainings-Log und Fortschritt."
        actions={
          tab === 'workouts'
            ? <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(s => !s)}>Training</Button>
            : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
        {([['workouts', Dumbbell, 'Training'], ['weight', Scale, 'Gewicht']] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={tab === key
                    ? { background: 'var(--accent)', color: '#000' }
                    : { color: 'var(--text-muted)' }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === 'workouts' && <>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatBox label="Gesamt" value={stats.totalWorkouts} />
          <StatBox label="Diesen Monat" value={stats.thisMonth} />
          <StatBox label="Diese Woche" value={stats.thisWeek} />
          <StatBox label="Letztes Training" value={stats.lastWorkout === '—' ? '—' : new Date(stats.lastWorkout).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} />
        </div>
      )}

      {/* New workout form */}
      {showForm && (
        <NewWorkoutForm qc={qc} onClose={() => setShowForm(false)} />
      )}

      {/* Workout list */}
      {workouts.length === 0 && !showForm && (
        <EmptyState icon={<Dumbbell size={22} />} title="Kein Training geloggt"
          description="Starte dein erstes Training und track deinen Fortschritt." />
      )}

      <div className="space-y-3">
        {workouts.map(w => (
          <div key={w.id} className="rounded-2xl overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                 onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Dumbbell size={16} style={{ color: 'var(--accent-fg)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{w.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(w.workout_date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  {w.exercises.length > 0 && ` · ${w.exercises.length} Übungen`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); del.mutate(w.id) }}
                        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <Trash2 size={13} />
                </button>
                {expanded === w.id ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
              </div>
            </div>

            {expanded === w.id && w.exercises.length > 0 && (
              <div className="px-4 pb-3 space-y-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="pt-2">
                  {w.exercises.map(ex => (
                    <div key={ex.id} className="flex items-center gap-2 py-1.5">
                      <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{ex.name}</span>
                      <div className="flex gap-2">
                        {ex.sets > 0 && <Badge variant="neutral">{ex.sets}×{ex.reps}</Badge>}
                        {ex.weight_kg > 0 && <Badge variant="neutral">{ex.weight_kg}kg</Badge>}
                        {ex.duration_min > 0 && <Badge variant="neutral">{ex.duration_min}min</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
                {w.notes && (
                  <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>📝 {w.notes}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      </>}

      {tab === 'weight' && <WeightTab />}
    </div>
  )
}

function WeightTab() {
  const qc = useQueryClient()
  const [kg, setKg]     = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const { data: entries = [] } = useQuery<BodyWeightEntry[]>({
    queryKey: ['weightLog'],
    queryFn: () => endpoints.weightLog(90).then(r => r.data),
  })

  const log = useMutation({
    mutationFn: () => endpoints.logWeight({ weightKg: parseFloat(kg.replace(',', '.')), logDate: date, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weightLog'] }); setKg(''); setNote('') },
  })
  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteWeight(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weightLog'] }),
  })

  const sorted  = [...entries].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const latest  = sorted[sorted.length - 1]
  const oldest  = sorted[0]
  const diff    = latest && oldest && latest !== oldest ? (latest.weight_kg - oldest.weight_kg) : null

  // Sparkline
  const maxW = Math.max(...sorted.map(e => e.weight_kg), 1)
  const minW = Math.min(...sorted.map(e => e.weight_kg), maxW - 1)
  const range = maxW - minW || 1
  const H = 60, W = 300
  const pts = sorted.map((e, i) => {
    const x = sorted.length > 1 ? (i / (sorted.length - 1)) * W : W / 2
    const y = H - ((e.weight_kg - minW) / range) * H
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="space-y-4">
      {/* Log form */}
      <Card className="p-4">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Gewicht eintragen</p>
        <div className="flex gap-2 items-end">
          <div className="relative flex-shrink-0" style={{ width: 100 }}>
            <input
              value={kg}
              onChange={e => setKg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && kg && log.mutate()}
              placeholder="kg"
              type="number" step="0.1" inputMode="decimal"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
                 className="px-3 py-2 rounded-xl text-sm outline-none"
                 style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
          <input value={note} onChange={e => setNote(e.target.value)}
                 placeholder="Notiz (optional)" className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                 style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
          <Button variant="primary" size="sm" disabled={!kg} onClick={() => log.mutate()}>Speichern</Button>
        </div>
      </Card>

      {/* Stats row */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{latest.weight_kg} kg</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Aktuell</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xl font-bold tabular-nums" style={{ color: diff === null ? 'var(--text-muted)' : diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
              {diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>seit {sorted.length} Einträgen</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{entries.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Einträge</p>
          </Card>
        </div>
      )}

      {/* Sparkline chart */}
      {sorted.length > 1 && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Verlauf (90 Tage)</p>
          <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
              <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" points={pts} />
              {sorted.map((e, i) => {
                const x = sorted.length > 1 ? (i / (sorted.length - 1)) * W : W / 2
                const y = H - ((e.weight_kg - minW) / range) * H
                return <circle key={e.id} cx={x} cy={y} r={3} fill="var(--accent)" />
              })}
            </svg>
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>{sorted[0]?.log_date.slice(5)}</span>
              <span>{sorted[sorted.length - 1]?.log_date.slice(5)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Entry list */}
      {entries.length === 0 && (
        <EmptyState icon={<Scale size={22} />} title="Noch keine Einträge" description="Trag dein Gewicht ein, um deinen Fortschritt zu sehen." />
      )}
      <div className="space-y-1.5">
        {[...entries].sort((a, b) => b.log_date.localeCompare(a.log_date)).map(e => (
          <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-xl group"
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-sm font-semibold tabular-nums w-16" style={{ color: 'var(--text-primary)' }}>{e.weight_kg} kg</p>
            <p className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>
              {new Date(e.log_date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              {e.note && <span className="ml-2">{e.note}</span>}
            </p>
            <button onClick={() => del.mutate(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    style={{ color: 'var(--red)' }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </Card>
  )
}

function NewWorkoutForm({ qc, onClose }: { qc: ReturnType<typeof useQueryClient>; onClose: () => void }) {
  const [name, setName]   = useState('')
  const [date, setDate]   = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<Array<{ name: string; sets: number; reps: number; weightKg: number; durationMin: number }>>([])
  const [exName, setExName]   = useState('')
  const [sets, setSets]       = useState('3')
  const [reps, setReps]       = useState('10')
  const [weight, setWeight]   = useState('')
  const [duration, setDuration] = useState('')

  const save = useMutation({
    mutationFn: () => endpoints.createWorkout({ name, notes, workoutDate: date, exercises }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] })
      qc.invalidateQueries({ queryKey: ['fitnessStats'] })
      onClose()
    },
  })

  const addExercise = () => {
    if (!exName.trim()) return
    setExercises(es => [...es, {
      name: exName.trim(),
      sets: parseInt(sets) || 0,
      reps: parseInt(reps) || 0,
      weightKg: parseFloat(weight) || 0,
      durationMin: parseInt(duration) || 0,
    }])
    setExName(''); setWeight(''); setDuration('')
  }

  return (
    <Card className="p-4 mb-6">
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Neues Training</p>
      <div className="space-y-2 mb-4">
        <Input placeholder="Name (z.B. Oberkörper, Beinday…)" value={name} onChange={e => setName(e.target.value)} />
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input placeholder="Notizen (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {/* Exercises */}
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Übungen</p>

      {/* Quick add */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_EXERCISES.map(q => (
          <button key={q} onClick={() => setExName(q)}
                  className="px-2.5 py-1 rounded-lg text-xs transition-all"
                  style={{ background: exName === q ? 'var(--accent-soft)' : 'rgba(255,255,255,0.04)',
                           color: exName === q ? 'var(--accent-fg)' : 'var(--text-muted)',
                           border: `1px solid ${exName === q ? 'var(--accent-fg)' : 'transparent'}` }}>
            {q}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input placeholder="Übung" value={exName} onChange={e => setExName(e.target.value)} />
        <div className="flex gap-1">
          <Input placeholder="Sätze" value={sets} onChange={e => setSets(e.target.value)} />
          <Input placeholder="Wdh." value={reps} onChange={e => setReps(e.target.value)} />
          <Input placeholder="kg" value={weight} onChange={e => setWeight(e.target.value)} />
        </div>
      </div>
      <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={addExercise} className="mb-3">
        Übung hinzufügen
      </Button>

      {exercises.length > 0 && (
        <div className="space-y-1 mb-4">
          {exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>{ex.name}</span>
              {ex.sets > 0 && <Badge variant="neutral">{ex.sets}×{ex.reps}</Badge>}
              {ex.weightKg > 0 && <Badge variant="neutral">{ex.weightKg}kg</Badge>}
              <button onClick={() => setExercises(es => es.filter((_, j) => j !== i))}>
                <X size={12} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="primary" size="sm" disabled={!name.trim()} loading={save.isPending} onClick={() => save.mutate()}>
          Speichern
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Abbrechen</Button>
      </div>
    </Card>
  )
}
