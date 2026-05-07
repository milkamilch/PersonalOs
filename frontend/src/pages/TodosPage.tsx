import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckSquare, Repeat2, ChevronDown } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Todo, RecurringTodo } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Input, EmptyState } from '../components/ui'

const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly:MONDAY',    label: 'Wöchentlich Mo' },
  { value: 'weekly:TUESDAY',   label: 'Wöchentlich Di' },
  { value: 'weekly:WEDNESDAY', label: 'Wöchentlich Mi' },
  { value: 'weekly:THURSDAY',  label: 'Wöchentlich Do' },
  { value: 'weekly:FRIDAY',    label: 'Wöchentlich Fr' },
  { value: 'weekly:SATURDAY',  label: 'Wöchentlich Sa' },
  { value: 'weekly:SUNDAY',    label: 'Wöchentlich So' },
]

export default function TodosPage() {
  const qc = useQueryClient()
  const [text, setText]   = useState('')
  const [tab, setTab]     = useState<'todos' | 'recurring'>('todos')
  const [rText, setRText] = useState('')
  const [rRec, setRRec]   = useState('daily')
  const [showRForm, setShowRForm] = useState(false)

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: () => endpoints.todos().then(r => r.data),
  })
  const { data: recurring = [] } = useQuery<RecurringTodo[]>({
    queryKey: ['recurringTodos'],
    queryFn: () => endpoints.recurringTodos().then(r => r.data),
    refetchInterval: 60_000,
  })

  const create = useMutation({
    mutationFn: () => endpoints.createTodo(text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); setText('') },
  })
  const doneMut = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => endpoints.doneTodo(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
  const createR = useMutation({
    mutationFn: () => endpoints.createRecurringTodo({ text: rText, recurrence: rRec }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurringTodos'] }); setRText(''); setShowRForm(false) },
  })
  const deleteR = useMutation({
    mutationFn: (id: number) => endpoints.deleteRecurringTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurringTodos'] }),
  })
  const toggleR = useMutation({
    mutationFn: (id: number) => endpoints.toggleRecurringTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurringTodos'] }),
  })

  const open   = todos.filter(t => !t.done)
  const closed = todos.filter(t =>  t.done)
  const dueToday = recurring.filter(r => r.due_today)

  return (
    <div className="page-root page-medium">
      <PageHeader title="Todos" subtitle="Aufgaben und wiederkehrende Routinen." />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
        {([['todos', CheckSquare, 'Todos'], ['recurring', Repeat2, 'Wiederkehrend']] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={tab === key
                    ? { background: 'var(--accent)', color: '#000' }
                    : { color: 'var(--text-muted)' }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === 'todos' && (
        <>
          {/* Recurring due today — shown at top as reminder */}
          {dueToday.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                Heute fällig
              </p>
              <div className="space-y-1.5">
                {dueToday.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all"
                       style={{ background: r.done_today ? 'rgba(48,209,88,0.06)' : 'rgba(10,132,255,0.06)', border: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => toggleR.mutate(r.id)}
                            className="w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all"
                            style={r.done_today ? { background: 'var(--green)', borderColor: 'var(--green)' } : { background: 'transparent', borderColor: 'rgba(10,132,255,0.4)' }}>
                      {r.done_today && <svg viewBox="0 0 12 12" className="w-3 h-3"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none" /></svg>}
                    </button>
                    <Repeat2 size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span className="flex-1 text-sm" style={{ color: r.done_today ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: r.done_today ? 'line-through' : 'none' }}>
                      {r.text}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.recurrence_label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-7">
            <Input
              placeholder="Neue Aufgabe…"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && text && create.mutate()}
              className="flex-1"
            />
            <Button variant="primary" size="md" disabled={!text.trim()} icon={<Plus size={16} />} onClick={() => text && create.mutate()} />
          </div>

          {todos.length === 0 && dueToday.length === 0 && (
            <EmptyState icon={<CheckSquare size={22} />} title="Keine Todos"
              description="Alle Aufgaben erledigt oder noch nichts eingetragen." />
          )}

          {open.length > 0 && (
            <div className="space-y-1.5 mb-6">
              {open.map(t => (
                <TodoRow key={t.id} todo={t}
                  onToggle={() => doneMut.mutate({ id: t.id, done: true })}
                  onDelete={() => del.mutate(t.id)} />
              ))}
            </div>
          )}

          {closed.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>Erledigt</p>
              <div className="space-y-1.5">
                {closed.map(t => (
                  <TodoRow key={t.id} todo={t}
                    onToggle={() => doneMut.mutate({ id: t.id, done: false })}
                    onDelete={() => del.mutate(t.id)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'recurring' && (
        <>
          <button
            onClick={() => setShowRForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5 text-sm font-medium transition-all active:scale-95"
            style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
            <Plus size={16} /> Neue Routine <ChevronDown size={14} style={{ transform: showRForm ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
          </button>

          {showRForm && (
            <div className="mb-5 p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <Input placeholder="Was möchtest du täglich / wöchentlich tun?" value={rText} onChange={e => setRText(e.target.value)} />
              <select value={rRec} onChange={e => setRRec(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" disabled={!rText.trim()} onClick={() => createR.mutate()}>Speichern</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowRForm(false)}>Abbrechen</Button>
              </div>
            </div>
          )}

          {recurring.length === 0 && (
            <EmptyState icon={<Repeat2 size={22} />} title="Keine Routinen"
              description="Erstelle wiederkehrende Aufgaben für tägliche oder wöchentliche Routinen." />
          )}

          <div className="space-y-1.5">
            {recurring.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl group"
                   style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <Repeat2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{r.text}</span>
                <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                  {r.recurrence_label}
                </span>
                <button onClick={() => deleteR.mutate(r.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
                        style={{ color: 'var(--red)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TodoRow({ todo, onToggle, onDelete }: {
  todo: Todo; onToggle: () => void; onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl group transition-all duration-150"
         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
      <button onClick={onToggle}
              className="w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all duration-150"
              style={todo.done
                ? { background: 'var(--accent)', borderColor: 'var(--accent)' }
                : { background: 'transparent', borderColor: 'var(--border-strong)' }}>
        {todo.done && (
          <svg viewBox="0 0 12 12" className="w-3 h-3">
            <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        )}
      </button>

      <span className="flex-1 text-sm transition-colors"
            style={{ color: todo.done ? 'var(--text-muted)' : 'var(--text-primary)',
                     textDecoration: todo.done ? 'line-through' : 'none' }}>
        {todo.text}
      </span>

      <button onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}
