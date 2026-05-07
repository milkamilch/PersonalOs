import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pin, Trash2, X, Check } from 'lucide-react'
import { endpoints } from '../api/client'
import type { QuickNote, NoteColor } from '../api/types'
import PageHeader from '../components/PageHeader'

const COLORS: { id: NoteColor; label: string; bg: string; border: string }[] = [
  { id: 'default', label: 'Standard', bg: 'var(--bg-surface)',  border: 'var(--border-subtle)' },
  { id: 'yellow',  label: 'Gelb',     bg: 'rgba(255,214,10,0.08)',  border: 'rgba(255,214,10,0.25)' },
  { id: 'green',   label: 'Grün',     bg: 'rgba(48,209,88,0.08)',   border: 'rgba(48,209,88,0.25)' },
  { id: 'red',     label: 'Rot',      bg: 'rgba(255,69,58,0.08)',   border: 'rgba(255,69,58,0.25)' },
  { id: 'blue',    label: 'Blau',     bg: 'rgba(10,132,255,0.08)',  border: 'rgba(10,132,255,0.25)' },
]

const COLOR_DOT: Record<NoteColor, string> = {
  default: 'var(--text-muted)',
  yellow:  'var(--yellow)',
  green:   'var(--green)',
  red:     'var(--red)',
  blue:    'var(--accent)',
}

function colorStyle(c: NoteColor) {
  const col = COLORS.find(x => x.id === c) ?? COLORS[0]
  return { background: col.bg, border: `1px solid ${col.border}` }
}

export default function NotesPage() {
  const qc = useQueryClient()
  const [editId, setEditId] = useState<number | null>(null)
  const [draft, setDraft] = useState<{ title: string; content: string; color: NoteColor } | null>(null)
  const [creating, setCreating] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '', color: 'default' as NoteColor })

  const { data: notes = [] } = useQuery<QuickNote[]>({
    queryKey: ['notes'],
    queryFn: () => endpoints.notes().then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (b: object) => endpoints.createNote(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); setCreating(false); setNewNote({ title: '', content: '', color: 'default' }) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, b }: { id: number; b: object }) => endpoints.updateNote(id, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); setEditId(null); setDraft(null) },
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => endpoints.deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })

  function startEdit(n: QuickNote) {
    setEditId(n.id)
    setDraft({ title: n.title, content: n.content, color: n.color })
  }

  function saveEdit() {
    if (editId && draft) updateMut.mutate({ id: editId, b: draft })
  }

  function togglePin(n: QuickNote) {
    updateMut.mutate({ id: n.id, b: { pinned: n.pinned ? 0 : 1 } })
  }

  const pinned = notes.filter(n => n.pinned)
  const unpinned = notes.filter(n => !n.pinned)

  return (
    <div className="page-root">
      <PageHeader title="Notizen" subtitle="Schnelle Notizen und Ideen." />

      {/* New note button */}
      <button
        onClick={() => setCreating(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-6 text-sm font-medium transition-all active:scale-95"
        style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}
      >
        <Plus size={16} /> Neue Notiz
      </button>

      {/* Create form */}
      {creating && (
        <div className="mb-6 p-4 rounded-2xl space-y-3" style={colorStyle(newNote.color)}>
          <input
            autoFocus
            value={newNote.title}
            onChange={e => setNewNote(n => ({ ...n, title: e.target.value }))}
            placeholder="Titel (optional)"
            className="w-full bg-transparent outline-none text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          />
          <textarea
            value={newNote.content}
            onChange={e => setNewNote(n => ({ ...n, content: e.target.value }))}
            placeholder="Notiz schreiben…"
            rows={4}
            className="w-full bg-transparent outline-none text-sm resize-none"
            style={{ color: 'var(--text-secondary)' }}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setNewNote(n => ({ ...n, color: c.id }))}
                  className="w-5 h-5 rounded-full border-2 transition-all"
                  style={{
                    background: COLOR_DOT[c.id],
                    borderColor: newNote.color === c.id ? 'var(--text-primary)' : 'transparent',
                    opacity: newNote.color === c.id ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
              <button
                onClick={() => createMut.mutate(newNote)}
                disabled={!newNote.content.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                <Check size={14} /> Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Angeheftet</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {pinned.map(n => <NoteCard key={n.id} note={n} editId={editId} draft={draft} setDraft={setDraft} onEdit={startEdit} onSave={saveEdit} onCancel={() => { setEditId(null); setDraft(null) }} onPin={togglePin} onDelete={id => deleteMut.mutate(id)} />)}
          </div>
        </div>
      )}

      {/* All notes */}
      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Alle Notizen</p>}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {unpinned.map(n => <NoteCard key={n.id} note={n} editId={editId} draft={draft} setDraft={setDraft} onEdit={startEdit} onSave={saveEdit} onCancel={() => { setEditId(null); setDraft(null) }} onPin={togglePin} onDelete={id => deleteMut.mutate(id)} />)}
          </div>
        </div>
      )}

      {notes.length === 0 && !creating && (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Noch keine Notizen.</p>
          <p className="text-xs mt-1">Klicke auf "Neue Notiz" um loszulegen.</p>
        </div>
      )}
    </div>
  )
}

interface NoteCardProps {
  note: QuickNote
  editId: number | null
  draft: { title: string; content: string; color: NoteColor } | null
  setDraft: (d: { title: string; content: string; color: NoteColor } | null) => void
  onEdit: (n: QuickNote) => void
  onSave: () => void
  onCancel: () => void
  onPin: (n: QuickNote) => void
  onDelete: (id: number) => void
}

function NoteCard({ note, editId, draft, setDraft, onEdit, onSave, onCancel, onPin, onDelete }: NoteCardProps) {
  const isEditing = editId === note.id
  const c = isEditing && draft ? draft.color : note.color

  return (
    <div
      className="relative p-4 rounded-2xl group transition-all"
      style={colorStyle(c)}
      onClick={() => !isEditing && onEdit(note)}
    >
      {isEditing && draft ? (
        <div className="space-y-2" onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={draft.title}
            onChange={e => setDraft({ ...draft, title: e.target.value })}
            placeholder="Titel"
            className="w-full bg-transparent outline-none text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          />
          <textarea
            value={draft.content}
            onChange={e => setDraft({ ...draft, content: e.target.value })}
            rows={5}
            className="w-full bg-transparent outline-none text-sm resize-none"
            style={{ color: 'var(--text-secondary)' }}
          />
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5">
              {COLORS.map(col => (
                <button key={col.id} onClick={() => setDraft({ ...draft, color: col.id })}
                  className="w-4 h-4 rounded-full border-2 transition-all"
                  style={{ background: COLOR_DOT[col.id], borderColor: draft.color === col.id ? 'var(--text-primary)' : 'transparent', opacity: draft.color === col.id ? 1 : 0.5 }} />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button onClick={onCancel} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
              <button onClick={onSave} className="p-1 rounded-lg" style={{ color: 'var(--accent)' }}><Check size={14} /></button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {note.title && <p className="text-sm font-semibold mb-1 pr-6" style={{ color: 'var(--text-primary)' }}>{note.title}</p>}
          <p className="text-sm whitespace-pre-wrap line-clamp-6" style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
            {new Date(note.updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
          </p>

          {/* Hover actions */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button onClick={() => onPin(note)} className="p-1.5 rounded-lg transition-all"
              style={{ color: note.pinned ? 'var(--accent)' : 'var(--text-muted)', background: 'var(--bg-elevated)' }}>
              <Pin size={12} />
            </button>
            <button onClick={() => onDelete(note.id)} className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--red)', background: 'var(--bg-elevated)' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
