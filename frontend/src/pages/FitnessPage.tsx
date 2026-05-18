import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Workout, FitnessStats, BodyWeightEntry } from '../api/types'

const fmtDate = (s: string) => new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })


export default function FitnessPage() {
  const qc = useQueryClient()
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [showAddWeight, setShowAddWeight] = useState(false)
  const [workoutName, setWorkoutName] = useState('')
  const [weightVal, setWeightVal] = useState('')

  const { data: workouts = [] } = useQuery<Workout[]>({ queryKey: ['workouts'], queryFn: () => endpoints.workouts(30).then(r => r.data) })
  const { data: stats } = useQuery<FitnessStats>({ queryKey: ['fitnessStats'], queryFn: () => endpoints.fitnessStats().then(r => r.data) })
  const { data: weightLog = [] } = useQuery<BodyWeightEntry[]>({ queryKey: ['weightLog'], queryFn: () => endpoints.weightLog(30).then(r => r.data) })

  const createWorkout = useMutation({
    mutationFn: () => endpoints.createWorkout({ name: workoutName, notes: '', workoutDate: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workouts'] }); setWorkoutName(''); setShowAddWorkout(false) },
  })
  const logWeight = useMutation({
    mutationFn: () => endpoints.logWeight({ weightKg: parseFloat(weightVal), logDate: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weightLog'] }); setWeightVal(''); setShowAddWeight(false) },
  })
  const delWeight = useMutation({ mutationFn: (id: number) => endpoints.deleteWeight(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['weightLog'] }) })
  const delWorkout = useMutation({ mutationFn: (id: number) => endpoints.deleteWorkout(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }) })

  const sortedWeight = [...weightLog].sort((a, b) => a.log_date.localeCompare(b.log_date))
  const lastWeight  = sortedWeight[sortedWeight.length - 1]?.weight_kg
  const firstWeight = sortedWeight[0]?.weight_kg
  const weightDelta = lastWeight != null && firstWeight != null ? lastWeight - firstWeight : null

  const sparkPath = (() => {
    if (sortedWeight.length < 2) return ''
    const vals = sortedWeight.map(e => e.weight_kg)
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
    return 'M ' + vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${40 - ((v - min) / range) * 38 - 1}`).join(' L ')
  })()

  return (
    <div className="content">
      <PageHeader
        eyebrow="Fitness"
        title="Training"
        sub="Disziplin schlägt Motivation. Jedes Mal."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setShowAddWeight(true)}><Plus size={13} /> Gewicht</button>
            <button className="btn primary" onClick={() => setShowAddWorkout(true)}><Plus size={14} /> Workout</button>
          </div>
        }
      />

      {showAddWorkout && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-b" style={{ display: 'flex', gap: 8 }}>
            <input autoFocus value={workoutName} onChange={e => setWorkoutName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createWorkout.mutate() }}
              placeholder="Workout-Name (z.B. Push, Pull, Legs, 5km)"
              style={{ flex: 1, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <button className="btn primary" onClick={() => workoutName.trim() && createWorkout.mutate()}>Anlegen</button>
            <button className="btn ghost" onClick={() => setShowAddWorkout(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      {showAddWeight && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-b" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input autoFocus type="number" step="0.1" value={weightVal} onChange={e => setWeightVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') logWeight.mutate() }}
              placeholder="Gewicht in kg"
              style={{ width: 140, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>kg</span>
            <button className="btn primary" onClick={() => weightVal && logWeight.mutate()}>Eintragen</button>
            <button className="btn ghost" onClick={() => setShowAddWeight(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div className="bento" style={{ marginBottom: 16 }}>
        <div className="col-3 stat">
          <div className="l">Diese Woche</div>
          <div className="v">{stats?.thisWeek ?? 0}<span className="unit">×</span></div>
          <div className="delta">Trainingseinheiten</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Diesen Monat</div>
          <div className="v">{stats?.thisMonth ?? 0}<span className="unit">×</span></div>
          <div className="delta">Einheiten</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Aktuelles Gewicht</div>
          <div className="v">{lastWeight != null ? lastWeight.toFixed(1) : '—'}<span className="unit">{lastWeight != null ? 'kg' : ''}</span></div>
          {weightDelta != null && (
            <div className={`delta ${weightDelta < 0 ? 'up' : 'down'}`}>
              {weightDelta < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg (30 Tage)
            </div>
          )}
        </div>
        <div className="col-3 stat">
          <div className="l">Gesamt Workouts</div>
          <div className="v">{stats?.totalWorkouts ?? 0}</div>
          <div className="delta">alle Zeit</div>
        </div>
      </div>

      <div className="bento">
        <div className="col-7">
          <div className="card">
            <div className="card-h">
              <span className="accent-dot" />
              <span className="title">Workout-Verlauf</span>
              <div className="spacer" />
              <span className="meta">letzte 30 Tage</span>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              {workouts.length === 0 && <div className="empty" style={{ padding: 60 }}>Noch keine Workouts geloggt.</div>}
              {workouts.slice(0, 15).map((w, i) => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ width: 56, fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--fg-4)', flexShrink: 0 }}>{fmtDate(w.workout_date)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{w.name}</div>
                    {w.notes && <div style={{ fontSize: 11.5, color: 'var(--accent)', marginTop: 2 }}>★ {w.notes}</div>}
                    {w.exercises.length > 0 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{w.exercises.length} Übungen</div>}
                  </div>
                  <button onClick={() => delWorkout.mutate(w.id)} style={{ color: 'var(--fg-5)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-h"><span className="accent-dot" /><span className="title">Körpergewicht · 30 Tage</span></div>
            <div className="card-b">
              {lastWeight != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <div className="display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em' }}>
                    {lastWeight.toFixed(1)}<small style={{ fontSize: 14, color: 'var(--fg-3)' }}> kg</small>
                  </div>
                  {weightDelta != null && (
                    <span className={`pill ${weightDelta < 0 ? 'success' : 'danger'}`}>
                      {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                    </span>
                  )}
                </div>
              )}
              {sparkPath && (
                <svg viewBox="0 0 100 40" style={{ width: '100%', height: 60 }} preserveAspectRatio="none">
                  <path d={sparkPath} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                </svg>
              )}
              {sortedWeight.length === 0 && <div className="empty">Noch kein Gewicht eingetragen.</div>}
            </div>
          </div>
          {sortedWeight.length > 0 && (
            <div className="card">
              <div className="card-h"><span className="accent-dot" /><span className="title">Letzte Einträge</span></div>
              <div className="card-b" style={{ padding: 0 }}>
                {[...sortedWeight].reverse().slice(0, 5).map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-4)', width: 48 }}>{fmtDate(e.log_date)}</span>
                    <span style={{ flex: 1, fontFamily: 'Inter Tight', fontWeight: 600, fontSize: 14 }}>{e.weight_kg.toFixed(1)} kg</span>
                    <button onClick={() => delWeight.mutate(e.id)} style={{ color: 'var(--fg-5)', fontSize: 11 }}
                      onMouseEnter={el => (el.currentTarget.style.color = 'var(--rose)')}
                      onMouseLeave={el => (el.currentTarget.style.color = 'var(--fg-5)')}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
