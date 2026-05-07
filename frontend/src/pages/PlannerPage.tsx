import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, Plus, Trash2, BookOpen,
  CheckCircle, Clock, Target
} from 'lucide-react'
import { api, endpoints } from '../api/client'
import type { Document } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Badge, Card, Input, Select, Spinner, EmptyState } from '../components/ui'

interface Plan {
  id: number; documentId: number; docName: string; examDate: string
  totalPages: number; pagesDone: number; daysLeft: number
  dailyGoal: number; todayDone: number; pct: number
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  })

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl">
      <PageHeader
        title="Lernplaner"
        subtitle="Klausur-Countdown und tägliches Pensum."
        actions={
          <Button
            variant="secondary" size="sm" icon={<Plus size={13} />}
            onClick={() => setShowCreate(s => !s)}
          >
            Neuer Plan
          </Button>
        }
      />

      {showCreate && (
        <Card className="mb-6 space-y-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Neuen Lernplan erstellen
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Dokument</label>
              <Select
                value={form.documentId}
                onChange={e => setForm(f => ({ ...f, documentId: Number(e.target.value) }))}
              >
                <option value={0}>Wählen…</option>
                {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Klausurdatum</label>
              <Input
                type="date"
                value={form.examDate}
                onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Gesamtseiten</label>
              <Input
                type="number" min={1}
                value={form.totalPages}
                onChange={e => setForm(f => ({ ...f, totalPages: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary" size="sm"
              onClick={() => form.documentId && form.examDate && create.mutate()}
              loading={create.isPending}
            >
              Erstellen
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Abbrechen
            </Button>
          </div>
        </Card>
      )}

      {isLoading && <div className="flex justify-center py-20"><Spinner size={28} /></div>}

      {!isLoading && plans.length === 0 && (
        <EmptyState
          icon={<CalendarDays size={24} />}
          title="Noch keine Lernpläne"
          description="Erstelle deinen ersten Plan mit Klausurdatum und Seitenanzahl."
          action={
            <Button variant="secondary" size="sm" icon={<Plus size={13} />}
                    onClick={() => setShowCreate(true)}>
              Plan erstellen
            </Button>
          }
        />
      )}

      <div className="space-y-4">
        {plans.map(plan => {
          const isLate   = plan.daysLeft < 0
          const isUrgent = !isLate && plan.daysLeft <= 3
          const todayPgs = logPages[plan.id] ?? 0
          const urgencyColor = isLate ? 'var(--red-fg)' : isUrgent ? 'var(--yellow-fg)' : 'var(--green-fg)'

          return (
            <Card key={plan.id} padding="lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {plan.docName}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Badge variant={isLate ? 'red' : isUrgent ? 'yellow' : 'green'}>
                      <Clock size={10} />
                      {isLate
                        ? `${Math.abs(plan.daysLeft)}d überfällig`
                        : plan.daysLeft === 0 ? 'Heute!'
                        : `${plan.daysLeft} Tage`}
                    </Badge>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(plan.examDate).toLocaleDateString('de-DE', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => del.mutate(plan.id)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5"
                     style={{ color: 'var(--text-muted)' }}>
                  <span>{plan.pagesDone} / {plan.totalPages} Seiten</span>
                  <span style={{ color: urgencyColor }}>{plan.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden"
                     style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                       style={{
                         width: `${plan.pct}%`,
                         background: plan.pct >= 100
                           ? 'linear-gradient(90deg,var(--green-fg),#10b981)'
                           : isUrgent
                           ? 'linear-gradient(90deg,#fb923c,var(--red-fg))'
                           : 'linear-gradient(90deg,var(--accent),#4f46e5)',
                       }} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {[
                  { icon: Target,       label: 'Tagespensum',  value: `${plan.dailyGoal} S.`, color: 'var(--accent-fg)' },
                  { icon: CheckCircle,  label: 'Heute',        value: `${plan.todayDone} S.`, color: 'var(--green-fg)' },
                  { icon: BookOpen,     label: 'Verbleibend',  value: `${Math.max(0, plan.totalPages - plan.pagesDone)} S.`, color: 'var(--blue-fg)' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center"
                       style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <Icon size={13} className="mx-auto mb-1" style={{ color }} />
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Log */}
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Heute gelernt:</span>
                <Input
                  type="number" min={1} placeholder="0"
                  className="w-16 text-center"
                  value={todayPgs || ''}
                  onChange={e => setLogPages(p => ({ ...p, [plan.id]: Number(e.target.value) }))}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Seiten</span>
                <Button
                  variant="success" size="xs"
                  disabled={!todayPgs}
                  onClick={() => {
                    if (todayPgs > 0) {
                      logStudy.mutate({ id: plan.id, pages: todayPgs })
                      setLogPages(p => ({ ...p, [plan.id]: 0 }))
                    }
                  }}
                >
                  + eintragen
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
