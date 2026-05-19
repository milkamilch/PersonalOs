import PageHeader from '../components/PageHeader'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Settings, RefreshCw } from 'lucide-react'
import { endpoints } from '../api/client'
import type { FinanceTransaction, FinanceSummary, FinanceCategory, FinanceRecurring, FinanceMonthlyTotal } from '../api/types'

const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
const fmt0 = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)


export default function FinancePage() {
  const qc = useQueryClient()
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [showAdd, setShowAdd] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [form, setForm] = useState({ amount: '', description: '', type: 'expense' as 'income' | 'expense', category_id: '' })
  const [recurringForm, setRecurringForm] = useState({ name: '', amount: '', type: 'expense' as 'income' | 'expense', category_id: '', day_of_month: '1' })
  const [settingsForm, setSettingsForm] = useState({ monthly_income: '' })
  const [catForm, setCatForm] = useState({ name: '', icon: '💳', color: '#7c3aed', budget_monthly: '', type: 'expense' as 'income' | 'expense' })
  const [settingsSaved, setSettingsSaved] = useState(false)

  const { data: summary } = useQuery<FinanceSummary>({ queryKey: ['financeSummary', month], queryFn: () => endpoints.financeSummary(month).then(r => r.data) })
  const { data: transactions = [] } = useQuery<FinanceTransaction[]>({ queryKey: ['transactions', month], queryFn: () => endpoints.financeTransactions({ month }).then(r => r.data) })
  const { data: categories = [] } = useQuery<FinanceCategory[]>({ queryKey: ['financeCategories'], queryFn: () => endpoints.financeCategories().then(r => r.data) })
  const { data: recurring = [] } = useQuery<FinanceRecurring[]>({ queryKey: ['financeRecurring'], queryFn: () => endpoints.financeRecurring().then(r => r.data) })
  const { data: monthlyTotals = [] } = useQuery<FinanceMonthlyTotal[]>({ queryKey: ['financeMonthlyTotals'], queryFn: () => endpoints.financeMonthlyTotals(6).then(r => r.data) })
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ['financeSettings'],
    queryFn: () => endpoints.financeSettings().then(r => r.data),
    enabled: showSettings,
  })

  const saveSettings = useMutation({
    mutationFn: () => endpoints.saveFinanceSettings({ monthly_income: settingsForm.monthly_income }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeSummary'] })
      qc.invalidateQueries({ queryKey: ['financeSettings'] })
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    },
  })
  const createCategory = useMutation({
    mutationFn: () => endpoints.createFinanceCategory({
      name: catForm.name,
      icon: catForm.icon,
      color: catForm.color,
      budgetMonthly: parseFloat(catForm.budget_monthly) || 0,
      type: catForm.type,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeCategories'] })
      qc.invalidateQueries({ queryKey: ['financeSummary'] })
      setCatForm({ name: '', icon: '💳', color: '#7c3aed', budget_monthly: '', type: 'expense' })
    },
  })
  const deleteCategory = useMutation({
    mutationFn: (id: number) => endpoints.deleteFinanceCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financeCategories'] }); qc.invalidateQueries({ queryKey: ['financeSummary'] }) },
  })

  const createTx = useMutation({
    mutationFn: () => endpoints.createTransaction({ amount: parseFloat(form.amount), description: form.description, type: form.type, txDate: now.toISOString().slice(0, 10), categoryId: form.category_id ? Number(form.category_id) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['financeSummary'] }); setShowAdd(false); setForm({ amount: '', description: '', type: 'expense', category_id: '' }) },
  })
  const deleteTx = useMutation({ mutationFn: (id: number) => endpoints.deleteTransaction(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['financeSummary'] }) } })

  const createRecurring = useMutation({
    mutationFn: () => endpoints.createFinanceRecurring({
      name: recurringForm.name,
      amount: parseFloat(recurringForm.amount),
      type: recurringForm.type,
      categoryId: recurringForm.category_id ? Number(recurringForm.category_id) : null,
      dayOfMonth: parseInt(recurringForm.day_of_month) || 1,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financeRecurring'] })
      setRecurringForm({ name: '', amount: '', type: 'expense', category_id: '', day_of_month: '1' })
    },
  })
  const deleteRecurring = useMutation({
    mutationFn: (id: number) => endpoints.deleteFinanceRecurring(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeRecurring'] }),
  })
  const toggleRecurring = useMutation({
    mutationFn: (id: number) => endpoints.toggleFinanceRecurring(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeRecurring'] }),
  })

  useEffect(() => {
    if (settings) setSettingsForm({ monthly_income: settings.monthly_income ?? '' })
  }, [settings])

  const actualIncome = summary?.income ?? 0
  const budgetTarget = summary?.monthlyIncome ?? 0
  const expenses     = summary?.expenses ?? 0
  const balance      = summary?.balance ?? (actualIncome - expenses)
  const pct          = budgetTarget > 0 ? Math.min(expenses / budgetTarget, 1) : 0
  const monthName    = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  return (
    <div className="content">
      <PageHeader
        eyebrow={monthName}
        title="Finanzen"
        sub="Geld ist Brennstoff. Wofür verbrennst du es?"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={() => setShowRecurring(v => !v)}><RefreshCw size={13} /> Daueraufträge</button>
            <button className="btn ghost" onClick={() => setShowSettings(v => !v)}><Settings size={13} /></button>
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

      {showSettings && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h">
            <span className="accent-dot" />
            <span className="title">Einstellungen</span>
            <div className="spacer" />
            {settingsSaved && <span style={{ fontSize: 11, color: 'var(--green)', marginRight: 8 }}>✓ Gespeichert</span>}
          </div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Budget */}
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 10 }}>Monatliches Einkommen / Budget</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={settingsForm.monthly_income}
                  onChange={e => setSettingsForm({ ...settingsForm, monthly_income: e.target.value })}
                  placeholder="z.B. 2500"
                  type="number"
                  step="1"
                  style={{ width: 160, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }}
                />
                <span style={{ fontSize: 13, color: 'var(--fg-4)' }}>€ / Monat</span>
                <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => saveSettings.mutate()}>Speichern</button>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-5)', marginTop: 6 }}>Dient als Referenz für die Ausgaben-Fortschrittsanzeige.</div>
            </div>

            {/* Categories */}
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 10 }}>Kategorien</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {categories.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '5px 10px', fontSize: 13 }}>
                    <span>{c.icon}</span>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.budget_monthly > 0 && <span style={{ color: 'var(--fg-4)', fontSize: 11 }}>{fmt0(c.budget_monthly)}</span>}
                    <span style={{ fontSize: 10.5, color: c.type === 'income' ? 'var(--green)' : 'var(--fg-4)', marginLeft: 2 }}>{c.type === 'income' ? 'Einnahme' : 'Ausgabe'}</span>
                    <button onClick={() => deleteCategory.mutate(c.id)} style={{ color: 'var(--fg-5)', marginLeft: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && <span style={{ fontSize: 13, color: 'var(--fg-4)' }}>Noch keine Kategorien.</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="Name"
                  style={{ width: 140, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', color: 'var(--fg)' }} />
                <input value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })}
                  placeholder="Icon"
                  style={{ width: 64, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', color: 'var(--fg)' }} />
                <input type="color" value={catForm.color} onChange={e => setCatForm({ ...catForm, color: e.target.value })}
                  style={{ width: 40, height: 34, border: '1px solid var(--line-strong)', borderRadius: 8, padding: 2, cursor: 'pointer' }} />
                <input value={catForm.budget_monthly} onChange={e => setCatForm({ ...catForm, budget_monthly: e.target.value })}
                  placeholder="Budget (€)" type="number" step="1"
                  style={{ width: 110, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', color: 'var(--fg)' }} />
                <select value={catForm.type} onChange={e => setCatForm({ ...catForm, type: e.target.value as 'income' | 'expense' })}
                  style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', color: 'var(--fg)' }}>
                  <option value="expense">Ausgabe</option>
                  <option value="income">Einnahme</option>
                </select>
                <button className="btn primary" onClick={() => catForm.name.trim() && createCategory.mutate()}><Plus size={13} /> Anlegen</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {showRecurring && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h">
            <span className="accent-dot" />
            <span className="title">Daueraufträge</span>
            <div className="spacer" />
            <span className="meta">{recurring.length} Einträge</span>
          </div>
          <div className="card-b">
            {/* Add form */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: recurring.length > 0 ? 16 : 0, paddingBottom: recurring.length > 0 ? 16 : 0, borderBottom: recurring.length > 0 ? '1px solid var(--line)' : 'none' }}>
              <input value={recurringForm.name} onChange={e => setRecurringForm({ ...recurringForm, name: e.target.value })}
                placeholder="Bezeichnung"
                style={{ flex: 1, minWidth: 160, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
              <input value={recurringForm.amount} onChange={e => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                placeholder="Betrag (€)" type="number" step="0.01"
                style={{ width: 120, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
              <select value={recurringForm.type} onChange={e => setRecurringForm({ ...recurringForm, type: e.target.value as 'income' | 'expense' })}
                style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }}>
                <option value="expense">Ausgabe</option>
                <option value="income">Einnahme</option>
              </select>
              <select value={recurringForm.category_id} onChange={e => setRecurringForm({ ...recurringForm, category_id: e.target.value })}
                style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }}>
                <option value="">Keine Kategorie</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input value={recurringForm.day_of_month} onChange={e => setRecurringForm({ ...recurringForm, day_of_month: e.target.value })}
                placeholder="Tag" type="number" min="1" max="31"
                style={{ width: 70, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
              <button className="btn primary" onClick={() => recurringForm.name && recurringForm.amount && createRecurring.mutate()}>
                <Plus size={13} /> Anlegen
              </button>
            </div>

            {/* List */}
            {recurring.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none', opacity: r.active ? 1 : 0.45 }}>
                <div style={{ fontSize: 16 }}>{r.category_icon ?? (r.type === 'income' ? '💰' : '💸')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-4)', marginTop: 1 }}>
                    {r.category_name ?? 'Keine Kategorie'} · jeden {r.day_of_month}. des Monats
                  </div>
                </div>
                <div className={`amt ${r.type === 'income' ? 'in' : 'out'}`} style={{ fontSize: 14, fontWeight: 600 }}>
                  {r.type === 'income' ? '+' : '−'}{fmt(Math.abs(r.amount))}
                </div>
                <button onClick={() => toggleRecurring.mutate(r.id)}
                  style={{ fontSize: 11, color: r.active ? 'var(--accent)' : 'var(--fg-4)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line-strong)', background: 'transparent', cursor: 'pointer' }}>
                  {r.active ? 'Aktiv' : 'Inaktiv'}
                </button>
                <button onClick={() => deleteRecurring.mutate(r.id)} style={{ color: 'var(--fg-5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {recurring.length === 0 && <div className="empty">Noch keine Daueraufträge angelegt.</div>}
          </div>
        </div>
      )}

      {/* Hero cards */}
      <div className="bento" style={{ marginBottom: 16 }}>
        <div className="col-4 card">
          <div className="card-b">
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Einkommen {now.toLocaleDateString('de-DE', { month: 'long' })}</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 8 }}>{actualIncome > 0 ? fmt0(actualIncome) : '—'}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--fg-4)' }}>
              {budgetTarget > 0 ? `Budget: ${fmt0(budgetTarget)}` : 'Kein Budget konfiguriert'}
            </div>
          </div>
        </div>
        <div className="col-4 card">
          <div className="card-b">
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Ausgaben</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 8 }}>{fmt0(expenses)}</div>
            <div style={{ marginTop: 8 }}>
              {budgetTarget > 0 ? (
                <>
                  <div className="bar thin"><div className="fill" style={{ width: `${pct * 100}%`, background: pct > 0.9 ? 'var(--rose)' : pct > 0.75 ? 'var(--amber)' : 'var(--accent)' }} /></div>
                  <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>{Math.round(pct * 100)} % des Budgets</div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{actualIncome > 0 ? `${Math.round(expenses / actualIncome * 100)} % der Einnahmen` : '–'}</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-4 card" style={{ background: 'var(--fg)', color: 'var(--bg)', border: 0 }}>
          <div className="card-b">
            <div style={{ fontSize: 11.5, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Übrig</div>
            <div className="display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 8 }}>{actualIncome > 0 ? fmt0(balance) : '—'}</div>
            {actualIncome > 0 && balance > 0 && (new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()) > 0 && <div style={{ fontSize: 12, opacity: 0.55, marginTop: 8 }}>~{fmt0(balance / (new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()))} / Tag</div>}
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

      {/* Monthly trend chart */}
      {monthlyTotals.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h">
            <span className="accent-dot" />
            <span className="title">Verlauf – letzte 6 Monate</span>
          </div>
          <div className="card-b">
            <MonthlyChart data={monthlyTotals} />
          </div>
        </div>
      )}
    </div>
  )
}

function MonthlyChart({ data }: { data: FinanceMonthlyTotal[] }) {
  const fmt0 = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1)
  const barW = 28
  const gap = 12
  const groupW = barW * 2 + gap
  const chartH = 120
  const totalW = data.length * (groupW + 24)

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, paddingBottom: 8, minWidth: totalW }}>
        {data.map(d => {
          const incH = Math.round((d.income / maxVal) * chartH)
          const expH = Math.round((d.expenses / maxVal) * chartH)
          const label = new Date(d.month + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
          return (
            <div key={d.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap, height: chartH }}>
                {/* Income bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: chartH }}>
                  {d.income > 0 && <div style={{ fontSize: 9.5, color: 'var(--fg-4)', marginBottom: 3 }}>{fmt0(d.income)}</div>}
                  <div style={{ width: barW, height: incH, background: 'var(--green)', borderRadius: '4px 4px 0 0', minHeight: d.income > 0 ? 3 : 0 }} />
                </div>
                {/* Expenses bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: chartH }}>
                  {d.expenses > 0 && <div style={{ fontSize: 9.5, color: 'var(--fg-4)', marginBottom: 3 }}>{fmt0(d.expenses)}</div>}
                  <div style={{ width: barW, height: expH, background: 'var(--rose)', borderRadius: '4px 4px 0 0', opacity: 0.75, minHeight: d.expenses > 0 ? 3 : 0 }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)', fontWeight: 500 }}>{label}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--fg-4)' }}>
          <div style={{ width: 10, height: 10, background: 'var(--green)', borderRadius: 2 }} /> Einnahmen
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--fg-4)' }}>
          <div style={{ width: 10, height: 10, background: 'var(--rose)', borderRadius: 2, opacity: 0.75 }} /> Ausgaben
        </div>
      </div>
    </div>
  )
}
