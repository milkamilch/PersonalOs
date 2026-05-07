import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, Settings, X } from 'lucide-react'
import { endpoints } from '../api/client'
import type { FinanceCategory, FinanceTransaction, FinanceSummary } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Input, Select, Card, Badge, EmptyState } from '../components/ui'

const CATEGORY_ICONS = ['🛒','🏠','🚗','🎮','🍕','👕','💊','📱','🎓','✈️','🍺','💰','💪','🎬','⚡','🐾']
const CAT_COLORS     = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#a855f7','#ec4899']

function fmt(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export default function FinancePage() {
  const qc = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [tab, setTab]     = useState<'overview' | 'transactions' | 'categories' | 'settings' | 'trends'>('overview')
  const [showTx, setShowTx]   = useState(false)
  const [showCat, setShowCat] = useState(false)

  const { data: summary }   = useQuery<FinanceSummary>({
    queryKey: ['financeSummary', month],
    queryFn: () => endpoints.financeSummary(month).then(r => r.data),
  })
  const { data: transactions = [] } = useQuery<FinanceTransaction[]>({
    queryKey: ['financeTransactions', month],
    queryFn: () => endpoints.financeTransactions({ month }).then(r => r.data),
  })
  const { data: categories = [] } = useQuery<FinanceCategory[]>({
    queryKey: ['financeCategories'],
    queryFn: () => endpoints.financeCategories().then(r => r.data),
  })
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ['financeSettings'],
    queryFn: () => endpoints.financeSettings().then(r => r.data),
  })

  const delTx = useMutation({
    mutationFn: (id: number) => endpoints.deleteTransaction(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financeTransactions'] }); qc.invalidateQueries({ queryKey: ['financeSummary'] }) },
  })

  const prevMonth = () => {
    const d = new Date(month + '-01'); d.setMonth(d.getMonth() - 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const d = new Date(month + '-01'); d.setMonth(d.getMonth() + 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthlyIncome = summary?.monthlyIncome ?? parseFloat(settings.monthly_income ?? '0')
  const expenses      = summary?.expenses ?? 0
  const budgetUsed    = monthlyIncome > 0 ? expenses / monthlyIncome : 0

  return (
    <div className="page-root page-medium">
      <PageHeader title="Finanzen" subtitle="Überblick über Einnahmen, Ausgaben und Budget." />

      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="px-3 py-1.5 rounded-xl text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          ← vorher
        </button>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{monthLabel(month)}</h2>
        <button onClick={nextMonth} className="px-3 py-1.5 rounded-xl text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          nächster →
        </button>
      </div>

      {/* Budget warning */}
      {budgetUsed > 0.9 && monthlyIncome > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl mb-6"
             style={{ background: budgetUsed >= 1 ? 'var(--red-soft)' : 'rgba(251,191,36,0.08)',
                      border: `1px solid ${budgetUsed >= 1 ? 'var(--red-border)' : 'rgba(251,191,36,0.25)'}` }}>
          <AlertTriangle size={18} style={{ color: budgetUsed >= 1 ? 'var(--red-fg)' : '#fbbf24', flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: budgetUsed >= 1 ? 'var(--red-fg)' : '#fbbf24' }}>
              {budgetUsed >= 1 ? 'Budget überschritten!' : 'Budget fast aufgebraucht'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {fmt(expenses)} von {fmt(monthlyIncome)} ausgegeben ({Math.round(budgetUsed * 100)}%)
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiCard label="Einnahmen" value={fmt(summary?.income ?? 0)} icon={<TrendingUp size={16} />} color="#22c55e" />
        <KpiCard label="Ausgaben"  value={fmt(expenses)} icon={<TrendingDown size={16} />} color="#ef4444" />
        <KpiCard label="Bilanz"
          value={fmt(summary?.balance ?? 0)}
          icon={<span style={{ fontSize: 16 }}>{(summary?.balance ?? 0) >= 0 ? '✓' : '!'}</span>}
          color={(summary?.balance ?? 0) >= 0 ? '#22c55e' : '#ef4444'} />
      </div>

      {/* Budget bar */}
      {monthlyIncome > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            <span>Budget {monthLabel(month)}</span>
            <span>{fmt(monthlyIncome - expenses)} übrig</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${Math.min(budgetUsed * 100, 100)}%`,
                          background: budgetUsed >= 1 ? '#ef4444' : budgetUsed > 0.75 ? '#f97316' : 'var(--accent)' }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
        {(['overview','trends','transactions','categories','settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                           color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {t === 'overview' ? 'Übersicht' : t === 'trends' ? 'Trends' : t === 'transactions' ? 'Buchungen' : t === 'categories' ? 'Kategorien' : 'Einstellungen'}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-3">
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowTx(true)} className="mb-4">
            Buchung erfassen
          </Button>
          {(summary?.byCategory ?? []).filter(c => c.spent > 0).map(c => (
            <CategoryBar key={c.id} category={c} />
          ))}
          {(summary?.byCategory ?? []).filter(c => c.spent > 0).length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              Noch keine Ausgaben in {monthLabel(month)}.
            </p>
          )}
        </div>
      )}

      {/* Trends */}
      {tab === 'trends' && <TrendsTab currentMonth={month} monthlyIncome={monthlyIncome} />}

      {/* Transactions */}
      {tab === 'transactions' && (
        <div>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowTx(true)} className="mb-4">
            Buchung erfassen
          </Button>
          {transactions.length === 0 && (
            <EmptyState icon={<TrendingDown size={22} />} title="Keine Buchungen"
              description="Erfasse deine erste Ausgabe oder Einnahme." />
          )}
          <div className="space-y-1.5">
            {transactions.map(t => (
              <TransactionRow key={t.id} tx={t} onDelete={() => delTx.mutate(t.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCat(true)} className="mb-4">
            Kategorie anlegen
          </Button>
          <div className="space-y-1.5">
            {categories.map(c => <CategoryRow key={c.id} cat={c} qc={qc} />)}
          </div>
          {categories.length === 0 && (
            <EmptyState icon={<Settings size={22} />} title="Keine Kategorien" description="Lege Kategorien an, um Ausgaben zu gruppieren." />
          )}
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <FinanceSettings settings={settings} qc={qc} />
      )}

      {/* Modals */}
      {showTx  && <AddTransactionModal categories={categories} onClose={() => setShowTx(false)}  qc={qc} />}
      {showCat && <AddCategoryModal onClose={() => setShowCat(false)} qc={qc} />}
    </div>
  )
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </Card>
  )
}

function CategoryBar({ category }: { category: FinanceCategory & { spent: number } }) {
  const pct = category.budget_monthly > 0 ? Math.min(category.spent / category.budget_monthly, 1) : 0
  const over = category.budget_monthly > 0 && category.spent > category.budget_monthly
  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{category.icon}</span>
        <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{category.name}</span>
        <span className="text-sm font-semibold" style={{ color: over ? 'var(--red-fg)' : 'var(--text-primary)' }}>{fmt(category.spent)}</span>
        {category.budget_monthly > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {fmt(category.budget_monthly)}</span>
        )}
        {over && <AlertTriangle size={13} style={{ color: 'var(--red-fg)' }} />}
      </div>
      {category.budget_monthly > 0 && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all"
               style={{ width: `${pct * 100}%`, background: over ? '#ef4444' : category.color }} />
        </div>
      )}
    </div>
  )
}

function TransactionRow({ tx, onDelete }: { tx: FinanceTransaction; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl group"
         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
      <span className="text-base flex-shrink-0">{tx.category_icon ?? (tx.type === 'income' ? '💰' : '💳')}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{tx.description || tx.category_name || '—'}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tx.tx_date} · {tx.category_name ?? '—'}</p>
      </div>
      <span className="text-sm font-semibold flex-shrink-0"
            style={{ color: tx.type === 'income' ? '#22c55e' : 'var(--text-primary)' }}>
        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
      </span>
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

function CategoryRow({ cat, qc }: { cat: FinanceCategory; qc: ReturnType<typeof useQueryClient> }) {
  const del = useMutation({
    mutationFn: () => endpoints.deleteFinanceCategory(cat.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeCategories'] }),
  })
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl group"
         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
      <span className="text-base">{cat.icon}</span>
      <div className="flex-1">
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{cat.name}</p>
        {cat.budget_monthly > 0 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Budget: {fmt(cat.budget_monthly)} / Monat</p>
        )}
      </div>
      <Badge variant={cat.type === 'income' ? 'green' : 'neutral'}>{cat.type === 'income' ? 'Einnahme' : 'Ausgabe'}</Badge>
      <button onClick={() => del.mutate()}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function FinanceSettings({ settings, qc }: { settings: Record<string, string>; qc: ReturnType<typeof useQueryClient> }) {
  const [income, setIncome] = useState(settings.monthly_income ?? '')
  const save = useMutation({
    mutationFn: () => endpoints.saveFinanceSettings({ monthly_income: income }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financeSettings'] }); qc.invalidateQueries({ queryKey: ['financeSummary'] }) },
  })
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Monatliches Einkommen</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Dein Netto-Einkommen pro Monat. Wird für die Budget-Auslastung genutzt.
        </p>
        <div className="flex gap-2">
          <Input type="number" placeholder="z.B. 2000" value={income} onChange={e => setIncome(e.target.value)} className="flex-1" />
          <Button variant="primary" size="sm" loading={save.isPending} onClick={() => save.mutate()}>Speichern</Button>
        </div>
      </Card>
    </div>
  )
}

function AddTransactionModal({ categories, onClose, qc }: {
  categories: FinanceCategory[]
  onClose: () => void
  qc: ReturnType<typeof useQueryClient>
}) {
  const [type, setType]     = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [desc, setDesc]     = useState('')
  const [catId, setCatId]   = useState<number | ''>('')
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10))

  const save = useMutation({
    mutationFn: () => endpoints.createTransaction({
      type, amount: parseFloat(amount), description: desc,
      categoryId: catId !== '' ? catId : null, txDate: date,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeTransactions'] })
      qc.invalidateQueries({ queryKey: ['financeSummary'] })
      onClose()
    },
  })

  const filtered = categories.filter(c => c.type === type)

  return (
    <Modal title="Buchung erfassen" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['expense','income'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ background: type === t ? (t === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.04)',
                             border: `1px solid ${type === t ? (t === 'income' ? '#22c55e' : '#ef4444') : 'var(--border-subtle)'}`,
                             color: type === t ? (t === 'income' ? '#22c55e' : '#ef4444') : 'var(--text-muted)' }}>
              {t === 'income' ? '↑ Einnahme' : '↓ Ausgabe'}
            </button>
          ))}
        </div>
        <Input type="number" placeholder="Betrag (€)" value={amount} onChange={e => setAmount(e.target.value)} />
        <Input placeholder="Beschreibung" value={desc} onChange={e => setDesc(e.target.value)} />
        {filtered.length > 0 && (
          <Select value={String(catId)} onChange={e => setCatId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Keine Kategorie</option>
            {filtered.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
        )}
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <div className="flex gap-2 pt-2">
          <Button variant="primary" className="flex-1" disabled={!amount || parseFloat(amount) <= 0} loading={save.isPending} onClick={() => save.mutate()}>Speichern</Button>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        </div>
      </div>
    </Modal>
  )
}

function AddCategoryModal({ onClose, qc }: { onClose: () => void; qc: ReturnType<typeof useQueryClient> }) {
  const [name, setName]     = useState('')
  const [icon, setIcon]     = useState('💳')
  const [color, setColor]   = useState('#7c3aed')
  const [budget, setBudget] = useState('')
  const [type, setType]     = useState<'expense'|'income'>('expense')

  const save = useMutation({
    mutationFn: () => endpoints.createFinanceCategory({
      name, icon, color, budgetMonthly: budget ? parseFloat(budget) : 0, type,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financeCategories'] }); onClose() },
  })

  return (
    <Modal title="Kategorie anlegen" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['expense','income'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ background: type === t ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                             border: `1px solid ${type === t ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                             color: type === t ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {t === 'income' ? 'Einnahme' : 'Ausgabe'}
            </button>
          ))}
        </div>
        <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ICONS.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)}
                    className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                    style={{ background: icon === ic ? 'var(--accent-soft)' : 'rgba(255,255,255,0.04)',
                             border: `1px solid ${icon === ic ? 'var(--accent-fg)' : 'transparent'}` }}>
              {ic}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {CAT_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
          ))}
        </div>
        {type === 'expense' && (
          <Input type="number" placeholder="Budget / Monat (€, optional)" value={budget} onChange={e => setBudget(e.target.value)} />
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="primary" className="flex-1" disabled={!name.trim()} loading={save.isPending} onClick={() => save.mutate()}>Erstellen</Button>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Trends tab ────────────────────────────────────────────────────────────
function TrendsTab({ currentMonth, monthlyIncome }: { currentMonth: string; monthlyIncome: number }) {
  // Build last 6 months
  const months: string[] = []
  const d = new Date(currentMonth + '-01')
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`)
  }

  const queries = months.map(m =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery<FinanceSummary>({
      queryKey: ['financeSummary', m],
      queryFn: () => endpoints.financeSummary(m).then(r => r.data),
      staleTime: 5 * 60_000,
    })
  )

  const data = months.map((m, i) => ({
    label: new Date(m + '-01').toLocaleDateString('de-DE', { month: 'short' }),
    expenses: queries[i].data?.expenses ?? 0,
    income:   queries[i].data?.income   ?? 0,
  }))

  const maxVal = Math.max(...data.map(d => Math.max(d.expenses, d.income, monthlyIncome)), 1)

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Ausgaben — letzte 6 Monate
        </p>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {d.expenses > 0 ? fmt(d.expenses).replace(' €','') : ''}
              </span>
              <div className="w-full rounded-t-lg transition-all duration-700 relative"
                   style={{
                     height: `${(d.expenses / maxVal) * 100}px`,
                     minHeight: d.expenses > 0 ? 4 : 0,
                     background: d.expenses > monthlyIncome && monthlyIncome > 0
                       ? 'var(--red)'
                       : d.expenses / monthlyIncome > 0.8 && monthlyIncome > 0
                       ? 'var(--yellow)'
                       : 'var(--accent)',
                   }} />
              {monthlyIncome > 0 && (
                <div className="absolute w-full border-t border-dashed opacity-30"
                     style={{ bottom: `${(monthlyIncome / maxVal) * 100}px`, borderColor: 'var(--red)' }} />
              )}
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
            </div>
          ))}
        </div>
        {monthlyIncome > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <div className="w-6 border-t border-dashed" style={{ borderColor: 'var(--red)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Budget {fmt(monthlyIncome)}</span>
          </div>
        )}
      </div>

      {/* Month comparison */}
      <div className="space-y-2">
        {data.slice().reverse().map((d, i) => (
          <div key={i} className="p-3 rounded-xl flex items-center gap-3"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <span className="text-sm font-medium w-8" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
            <div className="flex-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full"
                     style={{
                       width: `${Math.min((d.expenses / maxVal) * 100, 100)}%`,
                       background: monthlyIncome > 0 && d.expenses > monthlyIncome ? 'var(--red)' : 'var(--accent)',
                     }} />
              </div>
            </div>
            <span className="text-sm tabular-nums font-medium text-right w-20"
                  style={{ color: monthlyIncome > 0 && d.expenses > monthlyIncome ? 'var(--red)' : 'var(--text-primary)' }}>
              {fmt(d.expenses)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
