import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Goal, GoalHorizon } from '../api/types'

function PageHead({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {action}
    </div>
  )
}

const HORIZON_CONFIG: Record<GoalHorizon, { label: string; accent: string }> = {
  week:  { label: 'Diese Woche',    accent: '#2F8F4E' },
  month: { label: 'Diesen Monat',  accent: '#1C6BFF' },
  year:  { label: 'Dieses Jahr',   accent: '#8E5BFF' },
  life:  { label: 'Langfristig',   accent: '#C58A00' },
}

export default function GoalsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', horizon: 'month' as GoalHorizon, description: '' })

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => endpoints.goals().then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => endpoints.createGoal({ ...form, status: 'active', progress: 0 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setForm({ title: '', horizon: 'month', description: '' }); setShowAdd(false) },
  })
  const update = useMutation({
    mutationFn: ({ id, progress }: { id: number; progress: number }) => endpoints.updateGoal(id, { progress }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
  const del = useMutation({ mutationFn: (id: number) => endpoints.deleteGoal(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }) })

  const active = goals.filter(g => g.status === 'active')
  const groups = (['week', 'month', 'year', 'life'] as GoalHorizon[]).map(h => ({
    horizon: h,
    ...HORIZON_CONFIG[h],
    items: active.filter(g => g.horizon === h),
  }))

  return (
    <div className="content">
      <PageHead
        eyebrow="Nordstern"
        title="Ziele"
        sub="Vier Horizonte. Eine Richtung."
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Neues Ziel</button>
          </div>
        }
      />

      {showAdd && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-h">
            <span className="accent-dot" />
            <span className="title">Neues Ziel</span>
          </div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titel…"
              style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {(['week', 'month', 'year', 'life'] as GoalHorizon[]).map(h => (
                <button key={h} onClick={() => setForm({ ...form, horizon: h })}
                  style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500, border: '1px solid var(--line)',
                    background: form.horizon === h ? 'var(--fg)' : 'var(--surface)', color: form.horizon === h ? 'var(--bg)' : 'var(--fg-3)' }}>
                  {HORIZON_CONFIG[h].label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn primary" onClick={() => form.title.trim() && create.mutate()}>Anlegen</button>
              <button className="btn ghost" onClick={() => setShowAdd(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {groups.map(g => (
          <section key={g.horizon}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: g.accent, flexShrink: 0 }} />
              <h2 className="display" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{g.label}</h2>
              <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>{g.items.length} Ziele</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>
            {g.items.length === 0 && (
              <div style={{ color: 'var(--fg-4)', fontSize: 13, padding: '8px 20px' }}>Noch keine Ziele für diesen Horizont.</div>
            )}
            <div className="bento">
              {g.items.map(goal => (
                <div key={goal.id} className="col-4 card link">
                  <div className="card-b">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <span className="pill">{goal.horizon}</span>
                      {goal.target_date && (
                        <span className="pill" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
                          bis {new Date(goal.target_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 12, lineHeight: 1.35 }}>{goal.title}</div>
                    {goal.description && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginBottom: 12 }}>{goal.description}</div>}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span className="display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em' }}>
                        {goal.progress}<small style={{ fontSize: 13, color: 'var(--fg-3)' }}>%</small>
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0, 25, 50, 75, 100].map(p => (
                          <button key={p} onClick={() => update.mutate({ id: goal.id, progress: p })}
                            style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)', background: goal.progress === p ? g.accent : 'var(--surface-sunk)', color: goal.progress === p ? 'white' : 'var(--fg-4)' }}>{p}%</button>
                        ))}
                      </div>
                    </div>
                    <div className="bar thin"><div className="fill" style={{ width: `${goal.progress}%`, background: g.accent }} /></div>
                    <button onClick={() => del.mutate(goal.id)} style={{ marginTop: 12, color: 'var(--fg-4)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-4)')}>
                      <Trash2 size={11} /> Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
