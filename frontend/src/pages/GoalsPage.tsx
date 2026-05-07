import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Target, CheckCircle2 } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Goal, GoalHorizon, GoalStatus } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Input, Select, Card, EmptyState } from '../components/ui'

const HORIZONS: { key: GoalHorizon; label: string; color: string }[] = [
  { key: 'week',  label: 'Diese Woche',   color: '#22c55e' },
  { key: 'month', label: 'Diesen Monat',  color: '#60a5fa' },
  { key: 'year',  label: 'Dieses Jahr',   color: '#a78bfa' },
  { key: 'life',  label: 'Langfristig',   color: '#fb923c' },
]

export default function GoalsPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle]     = useState('')
  const [desc, setDesc]       = useState('')
  const [horizon, setHorizon] = useState<GoalHorizon>('month')
  const [targetDate, setTargetDate] = useState('')
  const [filter, setFilter]   = useState<GoalStatus | 'all'>('active')

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['goals', filter],
    queryFn: () => endpoints.goals({ ...(filter !== 'all' ? { status: filter } : {}) }).then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => endpoints.createGoal({ title, description: desc, horizon, targetDate: targetDate || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setTitle(''); setDesc(''); setShowNew(false) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...b }: { id: number } & object) => endpoints.updateGoal(id, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })

  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })

  const grouped = HORIZONS.reduce((acc, h) => {
    acc[h.key] = goals.filter(g => g.horizon === h.key)
    return acc
  }, {} as Record<GoalHorizon, Goal[]>)

  return (
    <div className="page-root page-medium">
      <PageHeader
        title="Ziele"
        subtitle="Was du diese Woche, diesen Monat, dieses Jahr und im Leben erreichen willst."
        actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowNew(s => !s)}>Neues Ziel</Button>}
      />

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {(['active','done','paused','all'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
                  className="px-3 py-1 rounded-lg text-xs transition-all"
                  style={{ background: filter === s ? 'var(--accent-soft)' : 'rgba(255,255,255,0.03)',
                           color: filter === s ? 'var(--accent-fg)' : 'var(--text-muted)',
                           border: `1px solid ${filter === s ? 'var(--accent-fg)' : 'transparent'}` }}>
            {s === 'active' ? 'Aktiv' : s === 'done' ? 'Erreicht' : s === 'paused' ? 'Pausiert' : 'Alle'}
          </button>
        ))}
      </div>

      {/* New goal form */}
      {showNew && (
        <Card className="p-4 mb-6">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Neues Ziel</p>
          <div className="space-y-2">
            <Input placeholder="Was willst du erreichen?" value={title} onChange={e => setTitle(e.target.value)} />
            <Input placeholder="Warum? Was bedeutet das dir? (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
            <div className="flex gap-2">
              <Select className="flex-1" value={horizon} onChange={e => setHorizon(e.target.value as GoalHorizon)}>
                {HORIZONS.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}
              </Select>
              <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="primary" size="sm" disabled={!title.trim()} loading={create.isPending} onClick={() => create.mutate()}>Erstellen</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Abbrechen</Button>
          </div>
        </Card>
      )}

      {goals.length === 0 && !showNew && (
        <EmptyState icon={<Target size={22} />} title="Keine Ziele"
          description="Definiere was du erreichen willst — diese Woche, dieses Jahr, im Leben." />
      )}

      {/* Grouped by horizon */}
      {HORIZONS.map(h => {
        const gs = grouped[h.key]
        if (!gs || gs.length === 0) return null
        return (
          <div key={h.key} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: h.color }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{h.label}</p>
            </div>
            <div className="space-y-2">
              {gs.map(g => (
                <GoalCard key={g.id} goal={g} color={h.color}
                  onProgress={(p) => update.mutate({ id: g.id, ...(p !== undefined && { progress: p }) })}
                  onStatus={(s) => update.mutate({ id: g.id, ...(s && { status: s }) })}
                  onDelete={() => del.mutate(g.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GoalCard({ goal, color, onProgress, onStatus, onDelete }: {
  goal: Goal; color: string
  onProgress: (p: number) => void
  onStatus: (s: GoalStatus) => void
  onDelete: () => void
}) {
  const done = goal.status === 'done'

  return (
    <div className="p-4 rounded-2xl group transition-all"
         style={{ background: done ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border-subtle)'}` }}>
      <div className="flex items-start gap-3">
        <button onClick={() => onStatus(done ? 'active' : 'done')}
                className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                style={{ background: done ? '#22c55e' : 'rgba(255,255,255,0.05)',
                         border: `2px solid ${done ? '#22c55e' : 'var(--border-default)'}` }}>
          {done && <CheckCircle2 size={12} color="white" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                                                       textDecoration: done ? 'line-through' : 'none' }}>
            {goal.title}
          </p>
          {goal.description && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{goal.description}</p>
          )}
          {goal.target_date && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Bis {new Date(goal.target_date).toLocaleDateString('de-DE')}
            </p>
          )}

          {/* Progress bar */}
          {!done && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Fortschritt</span>
                <span>{goal.progress}%</span>
              </div>
              <input type="range" min="0" max="100" value={goal.progress}
                     onChange={e => onProgress(parseInt(e.target.value))}
                     className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                     style={{ accentColor: color }} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {goal.status === 'active' && (
            <button onClick={() => onStatus('paused')}
                    className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 rounded-lg transition-all"
                    style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}>
              Pause
            </button>
          )}
          {goal.status === 'paused' && (
            <button onClick={() => onStatus('active')}
                    className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 rounded-lg transition-all"
                    style={{ color: 'var(--accent-fg)', background: 'var(--accent-soft)' }}>
              Fortsetzen
            </button>
          )}
          <button onClick={onDelete}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
