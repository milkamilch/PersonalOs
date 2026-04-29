import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, Plus, Trash2, BookOpen,
  CheckCircle, Clock, Target, Loader2
} from 'lucide-react'
import { api, endpoints } from '../api/client'
import type { Document } from '../api/types'

interface Plan {
  id: number
  documentId: number
  docName: string
  examDate: string
  totalPages: number
  pagesDone: number
  daysLeft: number
  dailyGoal: number
  todayDone: number
  pct: number
}

export default function PlannerPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ documentId: 0, examDate: '', totalPages: 100 })
  const [logPages, setLogPages] = useState<Record<number, number>>({})

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () => api.get('/planner').then(r => r.data),
  })

  const { data: docs = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => endpoints.documents().then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => api.post('/planner', null, { params: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); setShowCreate(false) },
  })

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/planner/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  })

  const logStudy = useMutation({
    mutationFn: ({ id, pages }: { id: number; pages: number }) =>
      api.post(`/planner/${id}/log`, null, { params: { pages } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }) },
  })

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(251,191,36,0.1)' }}>
            <CalendarDays size={20} style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Lernplaner</h1>
            <p className="text-sm text-gray-500">Klausur-Countdown & Tagespensum</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
          style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#c4b5fd' }}
        >
          <Plus size={15} />
          Neuer Plan
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-4 rounded-2xl space-y-3"
             style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-gray-300">Neuen Lernplan erstellen</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Dokument</label>
              <select
                value={form.documentId}
                onChange={e => setForm(f => ({ ...f, documentId: Number(e.target.value) }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f6fc' }}
              >
                <option value={0} style={{ background: '#1a1a2e' }}>Wählen…</option>
                {docs.map(d => <option key={d.id} value={d.id} style={{ background: '#1a1a2e' }}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Klausurdatum</label>
              <input
                type="date"
                value={form.examDate}
                onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f6fc' }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Gesamtseiten</label>
              <input
                type="number"
                value={form.totalPages}
                min={1}
                onChange={e => setForm(f => ({ ...f, totalPages: Number(e.target.value) }))}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f6fc' }}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => form.documentId && form.examDate && create.mutate()}
              className="px-4 py-2 rounded-xl text-sm transition-all"
              style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)', color: '#c4b5fd' }}
            >
              Erstellen
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-violet-400 animate-spin" />
        </div>
      )}

      {!isLoading && plans.length === 0 && (
        <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.15)' }}>
          <CalendarDays size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Lernpläne</p>
        </div>
      )}

      <div className="space-y-4">
        {plans.map(plan => {
          const isLate = plan.daysLeft < 0
          const isUrgent = plan.daysLeft >= 0 && plan.daysLeft <= 3
          const todayPages = logPages[plan.id] ?? 0

          return (
            <div key={plan.id} className="p-5 rounded-2xl"
                 style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-100">{plan.docName}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs flex items-center gap-1"
                          style={{ color: isLate ? '#f87171' : isUrgent ? '#fb923c' : '#34d399' }}>
                      <Clock size={11} />
                      {isLate
                        ? `${Math.abs(plan.daysLeft)}d überfällig`
                        : plan.daysLeft === 0
                        ? 'Heute!'
                        : `${plan.daysLeft} Tage`}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(plan.examDate).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}
                    </span>
                  </div>
                </div>
                <button onClick={() => del.mutate(plan.id)}
                        className="text-gray-700 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span>{plan.pagesDone} / {plan.totalPages} Seiten</span>
                  <span>{plan.pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                       style={{
                         width: `${plan.pct}%`,
                         background: plan.pct >= 100
                           ? 'linear-gradient(90deg,#34d399,#10b981)'
                           : isUrgent
                           ? 'linear-gradient(90deg,#fb923c,#ef4444)'
                           : 'linear-gradient(90deg,#7c3aed,#4f46e5)',
                       }} />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { icon: Target, label: 'Tagespensum', value: `${plan.dailyGoal} S.`, color: '#a78bfa' },
                  { icon: CheckCircle, label: 'Heute gelernt', value: `${plan.todayDone} S.`, color: '#34d399' },
                  { icon: BookOpen, label: 'Verbleibend', value: `${Math.max(0, plan.totalPages - plan.pagesDone)} S.`, color: '#60a5fa' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="p-3 rounded-xl text-center"
                       style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Icon size={14} style={{ color, margin: '0 auto 4px' }} />
                    <p className="text-base font-bold text-gray-100">{value}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Log today */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Heute gelernt:</span>
                <input
                  type="number"
                  min={1}
                  value={todayPages || ''}
                  onChange={e => setLogPages(p => ({ ...p, [plan.id]: Number(e.target.value) }))}
                  placeholder="0"
                  className="w-16 rounded-lg px-2 py-1 text-xs outline-none text-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f6fc' }}
                />
                <span className="text-xs text-gray-500">Seiten</span>
                <button
                  onClick={() => {
                    if (todayPages > 0) {
                      logStudy.mutate({ id: plan.id, pages: todayPages })
                      setLogPages(p => ({ ...p, [plan.id]: 0 }))
                    }
                  }}
                  disabled={!todayPages}
                  className="px-3 py-1 rounded-lg text-xs transition-all"
                  style={{
                    background: todayPages ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${todayPages ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: todayPages ? '#4ade80' : '#4b5563',
                  }}
                >
                  + eintragen
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
