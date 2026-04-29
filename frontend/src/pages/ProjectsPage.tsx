import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, FileText } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Project, Todo, Document } from '../api/types'

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2']

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [active, setActive] = useState<Project | null>(null)
  const [tab, setTab] = useState<'docs' | 'todos' | 'notes'>('docs')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#7c3aed' })
  const [todoText, setTodoText] = useState('')
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => endpoints.projects().then(r => r.data),
  })

  const { data: allDocs = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => endpoints.documents().then(r => r.data),
  })

  const { data: projDocs = [] } = useQuery<Document[]>({
    queryKey: ['projDocs', active?.id],
    queryFn: () => endpoints.projectDocs(active!.id).then(r => r.data),
    enabled: !!active,
  })

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ['todos', active?.id],
    queryFn: () => endpoints.todos(active!.id).then(r => r.data),
    enabled: !!active,
  })

  const { data: projNotes } = useQuery<string>({
    queryKey: ['projNotes', active?.id],
    queryFn: () => endpoints.projectNotes(active!.id).then(r => r.data.content),
    enabled: !!active,
  })

  useEffect(() => {
    if (projNotes !== undefined) setNotes(projNotes)
  }, [projNotes])

  const createProject = useMutation({
    mutationFn: () => endpoints.createProject(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowCreate(false); setForm({ name: '', description: '', color: '#7c3aed' }) },
  })

  const deleteProject = useMutation({
    mutationFn: (id: number) => endpoints.deleteProject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setActive(null) },
  })

  const addDoc = useMutation({
    mutationFn: (docId: number) => endpoints.addProjectDoc(active!.id, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projDocs', active?.id] }),
  })

  const removeDoc = useMutation({
    mutationFn: (docId: number) => endpoints.removeProjectDoc(active!.id, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projDocs', active?.id] }),
  })

  const createTodo = useMutation({
    mutationFn: () => endpoints.createTodo(todoText, active!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['todos', active?.id] }); setTodoText('') },
  })

  const doneTodo = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => endpoints.doneTodo(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos', active?.id] }),
  })

  const deleteTodo = useMutation({
    mutationFn: (id: number) => endpoints.deleteTodo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos', active?.id] }),
  })

  const saveNotes = async () => {
    await endpoints.saveProjectNotes(active!.id, notes)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const availableDocs = allDocs.filter(d => !projDocs.some(pd => pd.id === d.id))

  return (
    <div className="flex h-full">
      {/* Project list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-800 p-4 space-y-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200">Projekte</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {showCreate && (
          <div className="bg-gray-800 rounded-xl p-3 space-y-2 mb-2">
            <input
              autoFocus
              placeholder="Projektname"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 outline-none focus:ring-1 ring-violet-500"
            />
            <input
              placeholder="Beschreibung (optional)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 outline-none focus:ring-1 ring-violet-500"
            />
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ background: c }}
                  className={`w-5 h-5 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white/50' : ''}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => form.name && createProject.mutate()}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-sm py-1.5 rounded-lg transition-colors"
              >
                Erstellen
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-sm py-1.5 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => { setActive(p); setTab('docs'); setNotes('') }}
            className={`w-full text-left p-3 rounded-xl transition-colors ${
              active?.id === p.id ? 'bg-gray-800 ring-1 ring-gray-700' : 'hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="font-medium text-sm text-gray-200 truncate">{p.name}</span>
            </div>
            {p.description && (
              <p className="text-xs text-gray-500 mt-1 pl-4.5 truncate">{p.description}</p>
            )}
            <div className="flex gap-2 mt-1.5 pl-4.5 text-xs text-gray-500">
              <span>{p.docCount} Dok.</span>
              <span>{p.openTodoCount}/{p.todoCount} Todos</span>
            </div>
          </button>
        ))}

        {projects.length === 0 && !showCreate && (
          <p className="text-sm text-gray-500 text-center py-8">
            Noch keine Projekte.<br />Erstelle dein erstes Projekt.
          </p>
        )}
      </div>

      {/* Project detail */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!active ? (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <FolderKanbanIcon />
              <p className="mt-3 text-sm">Wähle ein Projekt aus</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ background: active.color }} />
                <div>
                  <h1 className="text-xl font-bold text-gray-100">{active.name}</h1>
                  {active.description && <p className="text-sm text-gray-400">{active.description}</p>}
                </div>
              </div>
              <button
                onClick={() => deleteProject.mutate(active.id)}
                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                title="Projekt löschen"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-800/50 rounded-xl p-1 w-fit">
              {(['docs', 'todos', 'notes'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === t ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {t === 'docs' ? 'Dokumente' : t === 'todos' ? 'Todos' : 'Notizen'}
                </button>
              ))}
            </div>

            {tab === 'docs' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Verknüpfte Dokumente</h3>
                  {projDocs.length === 0 ? (
                    <p className="text-sm text-gray-600">Keine Dokumente verknüpft.</p>
                  ) : (
                    <div className="space-y-2">
                      {projDocs.map(d => (
                        <div key={d.id} className="flex items-center gap-2 p-2.5 bg-gray-800 rounded-lg">
                          <FileText size={14} className="text-violet-400 flex-shrink-0" />
                          <span className="text-sm text-gray-200 flex-1">{d.name}</span>
                          <button
                            onClick={() => removeDoc.mutate(d.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {availableDocs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Hinzufügen</h3>
                    <div className="space-y-1.5">
                      {availableDocs.map(d => (
                        <button
                          key={d.id}
                          onClick={() => addDoc.mutate(d.id)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded-lg text-left transition-colors group"
                        >
                          <FileText size={14} className="text-gray-600 group-hover:text-violet-400 flex-shrink-0" />
                          <span className="text-sm text-gray-400 group-hover:text-gray-200">{d.name}</span>
                          <Plus size={14} className="ml-auto text-gray-600 group-hover:text-violet-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'todos' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    placeholder="Neue Aufgabe…"
                    value={todoText}
                    onChange={e => setTodoText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && todoText && createTodo.mutate()}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:ring-1 ring-violet-500"
                  />
                  <button
                    onClick={() => todoText && createTodo.mutate()}
                    className="px-3 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {todos.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-2.5 bg-gray-800 rounded-lg group">
                      <button
                        onClick={() => doneTodo.mutate({ id: t.id, done: !t.done })}
                        className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${
                          t.done ? 'bg-violet-600 border-violet-600' : 'border-gray-600 hover:border-violet-500'
                        }`}
                      >
                        {t.done && <svg viewBox="0 0 12 12" className="w-4 h-4 -m-px"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none"/></svg>}
                      </button>
                      <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                        {t.text}
                      </span>
                      <button
                        onClick={() => deleteTodo.mutate(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {todos.length === 0 && (
                    <p className="text-sm text-gray-600 py-4 text-center">Noch keine Aufgaben.</p>
                  )}
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notizen zum Projekt…"
                  className="w-full h-80 bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 outline-none focus:ring-1 ring-violet-500 resize-none font-mono"
                />
                <button
                  onClick={saveNotes}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm transition-colors"
                >
                  {notesSaved ? '✓ Gespeichert' : 'Speichern'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FolderKanbanIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
