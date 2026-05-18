/**
 * QuickAdd — bottom-sheet modal for fast capture (Todo · Habit · Ausgabe).
 *
 * Rebuilt against the active design tokens. The previous version used
 * `--bg-surface`, `--bg-elevated`, `--text-primary`, `--text-muted`,
 * `--border-subtle`, `--yellow` — none of which exist anymore. On a
 * light theme it rendered as a dark blob with invisible text.
 *
 * Two trigger variants:
 *   • `inline` (default) — soft accent pill, used in the Topbar or page actions
 *   • `fab`             — circular floating button, used in MobileNav
 *
 * Body keeps the same API/mutations; only the visuals + a11y were touched.
 */
import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus, CheckSquare, Heart, Wallet, X } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Habit } from '../api/types'

type Mode = 'todo' | 'habit' | 'expense'

const MODES: { id: Mode; icon: React.ElementType; label: string; color: string }[] = [
  { id: 'todo',    icon: CheckSquare, label: 'Todo',    color: 'var(--accent)' },
  { id: 'habit',   icon: Heart,       label: 'Habit',   color: 'var(--green)'  },
  { id: 'expense', icon: Wallet,      label: 'Ausgabe', color: 'var(--amber)'  },
]

interface Props {
  /** `inline` shows a soft accent pill; `fab` shows a circular floating button. */
  variant?: 'inline' | 'fab'
}

export default function QuickAdd({ variant = 'inline' }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('todo')
  const [text, setText] = useState('')
  const [amount, setAmount] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn:  () => endpoints.habits().then(r => r.data),
    enabled:  open && mode === 'habit',
  })

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open, mode])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const todoMut = useMutation({
    mutationFn: () => endpoints.createTodo(text),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['todos'] }); reset() },
  })
  const habitMut = useMutation({
    mutationFn: (id: number) => endpoints.toggleHabit(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['habits'] }); reset() },
  })
  const expenseMut = useMutation({
    mutationFn: () => endpoints.createTransaction({
      amount:      parseFloat(amount.replace(',', '.')),
      description: text || 'Schnellausgabe',
      type:        'expense',
      tx_date:     new Date().toISOString().slice(0, 10),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeTransactions'] })
      qc.invalidateQueries({ queryKey: ['financeSummary'] })
      reset()
    },
  })

  function reset() { setText(''); setAmount(''); setOpen(false) }

  function submit() {
    if (mode === 'todo'    && text.trim()) todoMut.mutate()
    else if (mode === 'expense' && amount)  expenseMut.mutate()
  }

  const currentMode = MODES.find(m => m.id === mode)!

  // ── Trigger ─────────────────────────────────────────────────────────────
  const trigger = variant === 'fab' ? (
    <button
      onClick={() => setOpen(true)}
      title="Schnell hinzufügen"
      aria-label="Schnell hinzufügen"
      style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'var(--accent)', color: '#fff',
        display: 'grid', placeItems: 'center',
        boxShadow: '0 6px 18px color-mix(in srgb, var(--accent) 38%, transparent), 0 1px 2px rgba(10,10,11,0.08)',
        border: '1px solid color-mix(in srgb, var(--accent) 70%, transparent)',
        transition: 'transform 120ms',
      }}
      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
      onMouseUp  ={e => (e.currentTarget.style.transform = '')}
      onMouseLeave={e => (e.currentTarget.style.transform = '')}
    >
      <Plus size={20} strokeWidth={2.1} />
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      aria-label="Schnell hinzufügen"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 30, padding: '0 12px', borderRadius: 8,
        background: 'var(--accent-soft)',
        color: 'var(--accent-fg)',
        border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
        fontSize: 12.5, fontWeight: 500,
        transition: 'background 120ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 18%, transparent)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent-soft)')}
    >
      <Plus size={13} />
      <span>Neu</span>
    </button>
  )

  if (!open) return trigger

  // ── Sheet ───────────────────────────────────────────────────────────────
  return (
    <>
      {trigger}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Schnell hinzufügen"
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(10,10,11,0.32)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'qa-fade 160ms ease',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 460, margin: '0 12px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '20px 20px 0 0',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            animation: 'qa-slide 220ms cubic-bezier(.2,.7,.2,1)',
          }}
        >
          {/* Sheet handle */}
          <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0 0' }}>
            <span style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--line-strong)' }} />
          </div>

          {/* Mode tabs */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--line)',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {MODES.map(m => {
                const active = mode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 8,
                      fontSize: 12.5, fontWeight: 500,
                      background: active ? `color-mix(in srgb, ${m.color} 12%, transparent)` : 'transparent',
                      color: active ? m.color : 'var(--fg-3)',
                      transition: 'all 120ms',
                    }}
                  >
                    <m.icon size={13} strokeWidth={1.8} />
                    {m.label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Schließen"
              className="iconbtn"
              style={{ width: 28, height: 28 }}
            >
              <X size={15} strokeWidth={1.7} />
            </button>
          </div>

          {/* Body */}
          <div style={{
            padding: 14,
            paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {mode === 'todo' && (
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Was zu erledigen?"
                style={inputStyle}
              />
            )}

            {mode === 'habit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {habits.filter(h => !h.done_today).map(h => (
                  <button
                    key={h.id}
                    onClick={() => habitMut.mutate(h.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      background: 'var(--surface-sunk)',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      textAlign: 'left',
                      transition: 'transform 120ms, background 120ms',
                    }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.99)')}
                    onMouseUp  ={e => (e.currentTarget.style.transform = '')}
                  >
                    <span style={{ fontSize: 18 }}>{h.icon}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>{h.name}</span>
                  </button>
                ))}
                {habits.filter(h => !h.done_today).length === 0 && (
                  <p className="empty" style={{ padding: '24px 0' }}>
                    Alle Habits für heute erledigt ✓
                  </p>
                )}
              </div>
            )}

            {mode === 'expense' && (
              <>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: 'var(--fg-3)', pointerEvents: 'none',
                  }}>€</span>
                  <input
                    ref={inputRef}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="0,00"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    style={{ ...inputStyle, paddingLeft: 26, fontFamily: 'Inter Tight, Inter, sans-serif', fontWeight: 500 }}
                  />
                </div>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder="Beschreibung (optional)"
                  style={inputStyle}
                />
              </>
            )}

            {mode !== 'habit' && (
              <button
                onClick={submit}
                disabled={mode === 'todo' ? !text.trim() : !amount}
                className="btn primary"
                style={{
                  height: 40, width: '100%', justifyContent: 'center',
                  background: currentMode.color, borderColor: currentMode.color,
                  color: '#fff',
                  opacity: (mode === 'todo' ? text.trim() : amount) ? 1 : 0.4,
                  cursor: (mode === 'todo' ? text.trim() : amount) ? 'pointer' : 'not-allowed',
                }}
              >
                Hinzufügen
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes qa-fade  { from { opacity: 0 } to { opacity: 1 } }
          @keyframes qa-slide { from { transform: translateY(16px); opacity: 0 } to { transform: none; opacity: 1 } }
          @media (prefers-reduced-motion: reduce) {
            [data-qa-anim] { animation: none !important }
          }
        `}</style>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px',
  fontSize: 14,
  background: 'var(--surface-sunk)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  color: 'var(--fg)',
  outline: 'none',
  transition: 'border-color 120ms, background 120ms',
}
