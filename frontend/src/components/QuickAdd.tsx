import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus, CheckSquare, Heart, Wallet, X } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Habit } from '../api/types'

type Mode = 'todo' | 'habit' | 'expense'

const MODES: { id: Mode; icon: React.ElementType; label: string; color: string }[] = [
  { id: 'todo',    icon: CheckSquare, label: 'Todo',    color: 'var(--accent)' },
  { id: 'habit',   icon: Heart,       label: 'Habit',   color: 'var(--green)' },
  { id: 'expense', icon: Wallet,      label: 'Ausgabe', color: 'var(--yellow)' },
]

export default function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('todo')
  const [text, setText] = useState('')
  const [amount, setAmount] = useState('')
  const [habitId, setHabitId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: () => endpoints.habits().then(r => r.data),
    enabled: open && mode === 'habit',
  })

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open, mode])

  const todoMut = useMutation({
    mutationFn: () => endpoints.createTodo(text),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos'] }); reset() },
  })
  const habitMut = useMutation({
    mutationFn: (id: number) => endpoints.toggleHabit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); reset() },
  })
  const expenseMut = useMutation({
    mutationFn: () => endpoints.createTransaction({
      amount: parseFloat(amount.replace(',', '.')),
      description: text || 'Schnellausgabe',
      type: 'expense',
      tx_date: new Date().toISOString().slice(0, 10),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeTransactions'] })
      qc.invalidateQueries({ queryKey: ['financeSummary'] })
      reset()
    },
  })

  function reset() { setText(''); setAmount(''); setHabitId(null); setOpen(false) }

  function submit() {
    if (mode === 'todo' && text.trim()) todoMut.mutate()
    else if (mode === 'habit' && habitId) habitMut.mutate(habitId)
    else if (mode === 'expense' && amount) expenseMut.mutate()
  }

  const currentMode = MODES.find(m => m.id === mode)!

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95"
        style={{
          background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
          color: 'var(--accent)',
          border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
        }}
        title="Schnell hinzufügen"
      >
        <Plus size={15} />
        <span className="text-sm font-medium hidden sm:inline">Neu</span>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
             onClick={() => setOpen(false)}>
          <div className="w-full sm:max-w-md mx-4 mb-safe rounded-t-3xl sm:rounded-2xl overflow-hidden"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
               onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
                 style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex gap-1">
                {MODES.map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                          style={mode === m.id
                            ? { background: `color-mix(in srgb, ${m.color} 15%, transparent)`, color: m.color }
                            : { color: 'var(--text-muted)' }}>
                    <m.icon size={14} />{m.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              {mode === 'todo' && (
                <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && submit()}
                       placeholder="Was zu erledigen?"
                       className="w-full px-4 py-3 rounded-xl text-base outline-none"
                       style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
              )}

              {mode === 'habit' && (
                <div className="space-y-2">
                  {habits.filter(h => !h.done_today).map(h => (
                    <button key={h.id} onClick={() => { setHabitId(h.id); habitMut.mutate(h.id) }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                      <span className="text-xl">{h.icon}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                    </button>
                  ))}
                  {habits.filter(h => !h.done_today).length === 0 && (
                    <p className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Alle Habits für heute erledigt ✓
                    </p>
                  )}
                </div>
              )}

              {mode === 'expense' && (
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                          style={{ color: 'var(--text-muted)' }}>€</span>
                    <input ref={inputRef} value={amount} onChange={e => setAmount(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && text.trim() && submit()}
                           placeholder="0,00"
                           type="number" inputMode="decimal" step="0.01"
                           className="w-full pl-8 pr-4 py-3 rounded-xl text-base outline-none"
                           style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                  </div>
                  <input value={text} onChange={e => setText(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && submit()}
                         placeholder="Beschreibung (optional)"
                         className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                         style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
                </div>
              )}

              {mode !== 'habit' && (
                <button onClick={submit}
                        disabled={mode === 'todo' ? !text.trim() : !amount}
                        className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40"
                        style={{ background: currentMode.color, color: '#000' }}>
                  Hinzufügen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
