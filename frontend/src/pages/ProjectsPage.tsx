import PageHeader from '../components/PageHeader'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Trash2 } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Project, Todo } from '../api/types'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)',
  borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)',
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#1C6BFF' })

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => endpoints.projects().then(r => r.data),
  })

  const createProject = useMutation({
    mutationFn: () => endpoints.createProject(form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setForm({ name: '', description: '', color: '#1C6BFF' })
      setShowAdd(false)
      setSelectedId((res.data as Project).id)
    },
  })
  const deleteProject = useMutation({
    mutationFn: (id: number) => endpoints.deleteProject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setSelectedId(null) },
  })

  useEffect(() => {
    if (projects.length > 0 && selectedId === null) setSelectedId(projects[0].id)
  }, [projects])

  const selected = projects.find(p => p.id === selectedId) ?? null

  return (
    <div className="content">
      <PageHeader
        eyebrow={`${projects.length} aktive Projekte`}
        title="Projekte"
        sub="Was du dauerhaft im Auge behältst."
        action={<button className="btn primary" onClick={() => setShowAdd(v => !v)}><Plus size={14} /> Neues Projekt</button>}
      />

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h"><span className="accent-dot" /><span className="title">Neues Projekt</span></div>
          <div className="card-b" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Name" autoFocus style={{ flex: 1, minWidth: 180, ...inputStyle }} />
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Beschreibung (optional)" style={{ flex: 2, minWidth: 240, ...inputStyle }} />
            <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
              style={{ width: 40, height: 34, border: '1px solid var(--line-strong)', borderRadius: 8, padding: 2, cursor: 'pointer' }} />
            <button className="btn primary" onClick={() => form.name.trim() && createProject.mutate()}>Anlegen</button>
            <button className="btn ghost" onClick={() => setShowAdd(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div className="bento" style={{ alignItems: 'flex-start' }}>
        <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.length === 0 && (
            <div className="card"><div className="card-b"><div className="empty">Noch keine Projekte.</div></div></div>
          )}
          {projects.map(p => {
            const done = p.todoCount - p.openTodoCount
            const pct  = p.todoCount > 0 ? done / p.todoCount : 0
            const active = selectedId === p.id
            return (
              <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                background: active ? `${p.color}12` : 'var(--surface)',
                border: `1px solid ${active ? p.color + '50' : 'var(--line)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                </div>
                {p.description && <div style={{ fontSize: 11.5, color: 'var(--fg-4)', marginBottom: 8, lineHeight: 1.4 }}>{p.description}</div>}
                <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--fg-4)', marginBottom: p.todoCount > 0 ? 8 : 0 }}>
                  <span>{p.openTodoCount} offen</span>
                  <span>{done} erledigt</span>
                </div>
                {p.todoCount > 0 && (
                  <div className="bar thin"><div className="fill" style={{ width: `${pct * 100}%`, background: p.color }} /></div>
                )}
              </div>
            )
          })}
        </div>

        <div className="col-8">
          {selected
            ? <ProjectDetail
                key={selected.id}
                project={selected}
                onDelete={() => deleteProject.mutate(selected.id)}
              />
            : <div className="card"><div className="card-b"><div className="empty" style={{ padding: 60 }}>Projekt auswählen oder anlegen.</div></div></div>
          }
        </div>
      </div>
    </div>
  )
}

function ProjectDetail({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const qc = useQueryClient()
  const [todoDraft, setTodoDraft] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ['todos', project.id],
    queryFn: () => endpoints.todos(project.id).then(r => r.data),
  })
  const { data: notesData } = useQuery<{ content: string }>({
    queryKey: ['projectNotes', project.id],
    queryFn: () => endpoints.projectNotes(project.id).then(r => r.data),
  })

  useEffect(() => {
    if (notesData !== undefined) setNotes(notesData.content ?? '')
  }, [notesData])

  const createTodo = useMutation({
    mutationFn: () => endpoints.createTodo(todoDraft, project.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', project.id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      setTodoDraft('')
    },
  })
  const doneTodo = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => endpoints.doneTodo(id, done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', project.id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
  const deleteTodo = useMutation({
    mutationFn: (id: number) => endpoints.deleteTodo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', project.id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
  const saveNotes = useMutation({
    mutationFn: () => endpoints.saveProjectNotes(project.id, notes),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  const open = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)
  const pct  = todos.length > 0 ? done.length / todos.length : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="card">
        <div className="card-b">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: project.color, flexShrink: 0 }} />
                <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{project.name}</span>
              </div>
              {project.description && <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 10 }}>{project.description}</div>}
              <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>{open.length} offen · {done.length} erledigt · {todos.length} gesamt</div>
            </div>
            <button onClick={onDelete} style={{ color: 'var(--fg-4)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-4)')}>
              <Trash2 size={12} /> Löschen
            </button>
          </div>
          {todos.length > 0 && (
            <div className="bar" style={{ height: 6, marginTop: 14 }}>
              <div className="fill" style={{ width: `${pct * 100}%`, background: project.color }} />
            </div>
          )}
        </div>
      </div>

      {/* Todos */}
      <div className="card">
        <div className="card-h">
          <span className="accent-dot" style={{ background: project.color }} />
          <span className="title">Aufgaben</span>
          <div className="spacer" />
          <span className="meta">{open.length} offen</span>
        </div>
        <div className="card-b">
          <div className="composer" style={{ marginBottom: open.length > 0 || done.length > 0 ? 12 : 0 }}>
            <Plus size={13} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
            <input placeholder="Neue Aufgabe…" value={todoDraft} onChange={e => setTodoDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && todoDraft.trim()) createTodo.mutate() }} />
            <span className="kbd">⏎</span>
          </div>
          {todos.length === 0 && <div className="empty">Noch keine Aufgaben für dieses Projekt.</div>}
          {open.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
              <button onClick={() => doneTodo.mutate({ id: t.id, done: true })}
                style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${project.color}`, background: 'transparent', flexShrink: 0, cursor: 'pointer', display: 'grid', placeItems: 'center' }} />
              <span style={{ flex: 1, fontSize: 13.5 }}>{t.text}</span>
              <button onClick={() => deleteTodo.mutate(t.id)} style={{ color: 'var(--fg-5)', fontSize: 13 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>✕</button>
            </div>
          ))}
          {done.length > 0 && (
            <>
              <div style={{ fontSize: 10.5, color: 'var(--fg-5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 14, marginBottom: 4 }}>Erledigt</div>
              {done.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--line)' : 'none', opacity: 0.55 }}>
                  <button onClick={() => doneTodo.mutate({ id: t.id, done: false })}
                    style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--line-strong)', background: 'var(--surface-sunk)', flexShrink: 0, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <Check size={11} style={{ color: 'var(--fg-3)' }} />
                  </button>
                  <span style={{ flex: 1, fontSize: 13.5, textDecoration: 'line-through', color: 'var(--fg-4)' }}>{t.text}</span>
                  <button onClick={() => deleteTodo.mutate(t.id)} style={{ color: 'var(--fg-5)', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>✕</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <div className="card-h">
          <span className="accent-dot" style={{ background: project.color }} />
          <span className="title">Notizen</span>
          <div className="spacer" />
          {saved && <span style={{ fontSize: 11, color: 'var(--green)', marginRight: 8 }}>✓ Gespeichert</span>}
          <button className="btn ghost" style={{ height: 28 }} onClick={() => saveNotes.mutate()}>Speichern</button>
        </div>
        <div className="card-b">
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            onKeyDown={e => { if (e.key === 's' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNotes.mutate() } }}
            placeholder="Notizen, Links, Ideen, Referenzen…"
            rows={10}
            style={{ width: '100%', background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '10px 12px', fontSize: 13.5, outline: 'none', color: 'var(--fg)', resize: 'vertical', lineHeight: 1.65, fontFamily: 'inherit' }} />
        </div>
      </div>
    </div>
  )
}
