import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Check } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Todo, RecurringTodo } from '../api/types'


type FilterKey = 'alle' | 'offen' | 'erledigt'

export default function TodosPage() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<FilterKey>('alle')

  const { data: todos = [] } = useQuery<Todo[]>({ queryKey: ['todos'], queryFn: () => endpoints.todos().then(r => r.data) })
  const { data: recurring = [] } = useQuery<RecurringTodo[]>({ queryKey: ['recurringTodos'], queryFn: () => endpoints.recurringTodos().then(r => r.data) })

  const create = useMutation({ mutationFn: () => endpoints.createTodo(draft), onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); setDraft('') } })
  const done = useMutation({ mutationFn: ({ id, d }: { id: number; d: boolean }) => endpoints.doneTodo(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }) })
  const del = useMutation({ mutationFn: (id: number) => endpoints.deleteTodo(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }) })
  const toggleRecurring = useMutation({ mutationFn: (id: number) => endpoints.toggleRecurringTodo(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['recurringTodos'] }) })

  const open = todos.filter(t => !t.done)
  const filtered = filter === 'alle' ? todos : filter === 'offen' ? open : todos.filter(t => t.done)
  const filters: FilterKey[] = ['alle', 'offen', 'erledigt']
  const recurringDue = recurring.filter(r => r.due_today && !r.done_today)

  return (
    <div className="content">
      <PageHeader
        eyebrow={`${open.length} offen · ${todos.filter(t => t.done).length} erledigt`}
        title="Aufgaben"
        sub="Die kleinen Dinge zwischen den großen."
      />

      {/* Recurring due today */}
      {recurringDue.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--amber)' }}>
          <div className="card-h">
            <span className="accent-dot" style={{ background: 'var(--amber)' }} />
            <span className="title">Wiederkehrend · heute fällig</span>
            <div className="spacer" />
            <span className="meta">{recurringDue.length} ausstehend</span>
          </div>
          <div className="card-b tight">
            {recurringDue.map(r => (
              <div key={r.id} className="todo" onClick={() => toggleRecurring.mutate(r.id)} style={{ cursor: 'pointer' }}>
                <div className="box" />
                <span className="text">{r.text}</span>
                <span className="tag">{r.recurrence_label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick add */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-b" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={14} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
            <input value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) create.mutate() }}
              placeholder="Neue Aufgabe — Enter zum Anlegen"
              style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 14, color: 'var(--fg)' }} />
            <span style={{ fontSize: 10.5, color: 'var(--fg-4)', padding: '1px 6px', borderRadius: 4, background: 'var(--surface-sunk)', border: '1px solid var(--line)' }}>⏎</span>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500, border: '1px solid var(--line)', cursor: 'pointer',
            background: filter === f ? 'var(--fg)' : 'var(--surface)', color: filter === f ? 'var(--bg)' : 'var(--fg-3)',
          }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-b" style={{ padding: 0 }}>
          {filtered.length === 0 && <div className="empty" style={{ padding: 60 }}>Nichts hier — alles erledigt 🎉</div>}
          {filtered.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: i > 0 ? '1px solid var(--line)' : 'none', opacity: t.done ? 0.55 : 1 }}>
              <button onClick={() => done.mutate({ id: t.id, d: !t.done })} style={{
                width: 20, height: 20, borderRadius: 6, background: t.done ? 'var(--accent)' : 'transparent',
                border: `1.5px solid ${t.done ? 'var(--accent)' : 'var(--line-strong)'}`,
                display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer',
              }}>
                {t.done && <Check size={11} color="white" />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--fg-3)' : 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-4)', marginTop: 2 }}>
                  {new Date(t.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  {t.projectId && ' · Projekt'}
                </div>
              </div>
              <button onClick={() => del.mutate(t.id)} style={{ color: 'var(--fg-5)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
