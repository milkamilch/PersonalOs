import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Project } from '../api/types'


export default function ProjectsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#1C6BFF' })

  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => endpoints.projects().then(r => r.data) })
  const create = useMutation({
    mutationFn: () => endpoints.createProject(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setForm({ name: '', description: '', color: '#1C6BFF' }); setShowAdd(false) },
  })
  const del = useMutation({ mutationFn: (id: number) => endpoints.deleteProject(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }) })

  return (
    <div className="content">
      <PageHeader
        eyebrow={`${projects.length} aktive Projekte`}
        title="Projekte"
        sub="Was du dauerhaft im Auge behältst."
        action={<button className="btn primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Neues Projekt</button>}
      />

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h"><span className="accent-dot" /><span className="title">Neues Projekt</span></div>
          <div className="card-b" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name"
              style={{ flex: 1, minWidth: 180, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Beschreibung (optional)"
              style={{ flex: 2, minWidth: 240, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
              style={{ width: 40, height: 34, border: '1px solid var(--line-strong)', borderRadius: 8, padding: 2, cursor: 'pointer' }} />
            <button className="btn primary" onClick={() => form.name.trim() && create.mutate()}>Anlegen</button>
            <button className="btn ghost" onClick={() => setShowAdd(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div className="bento">
        {projects.length === 0 && (
          <div className="col-12"><div className="empty" style={{ padding: 80 }}>Noch keine Projekte. Lege das erste an.</div></div>
        )}
        {projects.map(p => {
          const done = p.todoCount - p.openTodoCount
          const pct  = p.todoCount > 0 ? done / p.todoCount : 0
          return (
            <div key={p.id} className="col-4 card link">
              <div className="card-b">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: p.color, flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                {p.description && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginBottom: 16, lineHeight: 1.4 }}>{p.description}</div>}
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'Inter Tight', fontSize: 18, fontWeight: 600 }}>{p.openTodoCount}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>offen</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter Tight', fontSize: 18, fontWeight: 600, color: 'var(--fg-3)' }}>{done}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>erledigt</div>
                  </div>
                </div>
                <div className="bar thin"><div className="fill" style={{ width: `${pct * 100}%`, background: p.color }} /></div>
                <button onClick={e => { e.preventDefault(); del.mutate(p.id) }} style={{ marginTop: 12, color: 'var(--fg-4)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-4)')}>
                  <Trash2 size={11} /> Löschen
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
