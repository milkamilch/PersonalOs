import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Settings } from 'lucide-react'
import { endpoints } from '../api/client'
import type { FinanceTransaction, FinanceSummary, FinanceCategory } from '../api/types'

const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
const fmt0 = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)


export default function FinancePage() {
  const qc = useQueryClient()
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ amount: '', description: '', type: 'expense' as 'income' | 'expense', category_id: '' })

  const { data: summary } = useQuery<FinanceSummary>({ queryKey: ['financeSummary', month], queryFn: () => endpoints.financeSummary(month).then(r => r.data) })
  const { data: transactions = [] } = useQuery<FinanceTransaction[]>({ queryKey: ['transactions', month], queryFn: () => endpoints.financeTransactions({ month }).then(r => r.data) })
  const { data: categories = [] } = useQuery<FinanceCategory[]>({ queryKey: ['financeCategories'], queryFn: () => endpoints.financeCategories().then(r => r.data) })

  const createTx = useMutation({
    mutationFn: () => endpoints.createTransaction({ ...form, amount: parseFloat(form.amount), tx_date: now.toISOString().slice(0, 10), category_id: form.category_id ? Number(form.category_id) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['financeSummary'] }); setShowAdd(false); setForm({ amount: '', description: '', type: 'expense', category_id: '' }) },
  })
  const deleteTx = useMutation({ mutationFn: (id: number) => endpoints.deleteTransaction(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['financeSummary'] }) } })

  const income   = summary?.monthlyIncome ?? 0
  const expenses = summary?.expenses ?? 0
  const remaining = income - expenses
  const pct = income > 0 ? Math.min(expenses / income, 1) : 0
  const monthName = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div className="content">
      <PageHeader
        eyebrow={monthName}
        title="Finanzen"
        sub="Geld ist Brennstoff. Wofür verbrennst du es?"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost"><Settings size={13} /></button>
            <button className="btn primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Buchung</button>
          </div>
        }
      />

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h"><span className="accent-dot" /><span className="title">Neue Buchung</span></div>
          <div className="card-b" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Betrag (€)" type="number" step="0.01"
              style={{ width: 120, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Beschreibung"
              style={{ flex: 1, minWidth: 180, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
              style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }}>
              <option value="">Keine Kategorie</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
              style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }}>
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
            </select>
            <button className="btn primary" onClick={() => form.amount && form.description && createTx.mutate()}>Anlegen</button>
            <button className="btn ghost" onClick={() => setShowAdd(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Hero cards */}
      <div className="bento" style={{ marginBottom: 16 }}>
        <div className="col-4 card">
          <div className="card-b">
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Einkommen {now.toLocaleDateString('de-DE', { month: 'long' })}</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 8 }}>{income > 0 ? fmt0(income) : '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--fg-3)' }}>
              <span className="pill success"><span className="dot" />konfiguriert</span>
            </div>
          </div>
        </div>
        <div className="col-4 card">
          <div className="card-b">
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Ausgaben</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 8 }}>{fmt0(expenses)}</div>
            <div style={{ marginTop: 8 }}>
              <div className="bar thin"><div className="fill" style={{ width: `${pct * 100}%`, background: pct > 0.9 ? 'var(--rose)' : pct > 0.75 ? 'var(--amber)' : 'var(--accent)' }} /></div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>{Math.round(pct * 100)} % des Budgets</div>
            </div>
          </div>
        </div>
        <div className="col-4 card" style={{ background: 'var(--fg)', color: 'var(--bg)', border: 0 }}>
          <div className="card-b">
            <div style={{ fontSize: 11.5, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Übrig</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 8 }}>{income > 0 ? fmt0(remaining) : '—'}</div>
            {income > 0 && <div style={{ fontSize: 12, opacity: 0.55, marginTop: 8 }}>~{fmt0(remaining / Math.max(1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()))} / Tag</div>}
          </div>
        </div>
      </div>

      <div className="bento">
        <div className="col-7">
          <div className="card">
            <div className="card-h">
              <span className="accent-dot" />
              <span className="title">Letzte Buchungen</span>
              <div className="spacer" />
              <span className="meta">{transactions.length} Einträge</span>
            </div>
            <div className="card-b" style={{ paddingTop: 4 }}>
              {transactions.length === 0 && <div className="empty">Noch keine Buchungen diesen Monat.</div>}
              {transactions.slice(0, 20).map(t => (
                <div key={t.id} className="tx">
                  <div className="ic">{t.category_icon ?? (t.type === 'income' ? '💰' : '💸')}</div>
                  <div className="who">
                    <div className="t">{t.description}</div>
                    <div className="s">{new Date(t.tx_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · {t.category_name ?? 'Keine Kategorie'}</div>
                  </div>
                  <div className={`amt ${t.type === 'income' ? 'in' : 'out'}`}>
                    {t.type === 'income' ? '+' : '−'}{fmt(Math.abs(t.amount))}
                  </div>
                  <button onClick={() => deleteTx.mutate(t.id)} style={{ color: 'var(--fg-5)', marginLeft: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-5">
          <div className="card">
            <div className="card-h">
              <span className="accent-dot" />
              <span className="title">Budget je Kategorie</span>
            </div>
            <div className="card-b">
              {(summary?.byCategory ?? []).filter(c => c.budget_monthly > 0 || c.spent > 0).map((c, i) => {
                const p = c.budget_monthly > 0 ? c.spent / c.budget_monthly : 0
                return (
                  <div key={c.id} style={{ padding: '10px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{c.icon}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{c.name}</span>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                        <span style={{ color: p > 1 ? 'var(--rose)' : 'var(--fg)' }}>{fmt0(c.spent)}</span>
                        {c.budget_monthly > 0 && <span style={{ color: 'var(--fg-4)' }}> / {fmt0(c.budget_monthly)}</span>}
                      </span>
                    </div>
                    {c.budget_monthly > 0 && (
                      <div className="bar thin">
                        <div className="fill" style={{ width: `${Math.min(p, 1) * 100}%`, background: p > 0.95 ? 'var(--rose)' : p > 0.8 ? 'var(--amber)' : c.color }} />
                      </div>
                    )}
                  </div>
                )
              })}
              {(summary?.byCategory ?? []).filter(c => c.budget_monthly > 0 || c.spent > 0).length === 0 && (
                <div className="empty">Keine Kategorien angelegt.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
