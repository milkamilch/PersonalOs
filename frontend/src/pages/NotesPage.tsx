import PageHeader from '../components/PageHeader'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pin, Plus, Trash2, X } from 'lucide-react'
import { endpoints } from '../api/client'
import type { NoteColor, QuickNote } from '../api/types'

const NOTE_BG: Record<NoteColor, string> = {
  default: 'var(--surface)',
  yellow:  'color-mix(in srgb, #C58A00 14%, var(--surface))',
  blue:    'color-mix(in srgb, #1C6BFF 10%, var(--surface))',
  green:   'color-mix(in srgb, #2F8F4E 10%, var(--surface))',
  red:     'color-mix(in srgb, #C8344A 10%, var(--surface))',
}
const NOTE_DOT: Record<NoteColor, string> = {
  default: 'var(--fg-4)', yellow: '#C58A00', blue: '#1C6BFF', green: '#2F8F4E', red: '#C8344A',
}
const COLOR_OPTIONS: NoteColor[] = ['default', 'yellow', 'blue', 'green', 'red']


export default function NotesPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '', color: 'default' as NoteColor })
  const [editId, setEditId] = useState<number | null>(null)
  const [draft, setDraft] = useState<{ title: string; content: string; color: NoteColor } | null>(null)

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

  function startEdit(n: QuickNote) { setEditId(n.id); setDraft({ title: n.title, content: n.content, color: n.color }) }
  function saveEdit() { if (editId && draft) updateMut.mutate({ id: editId, b: draft }) }
  function togglePin(n: QuickNote) { updateMut.mutate({ id: n.id, b: { pinned: n.pinned ? 0 : 1 } }) }

  const pinned = notes.filter(n => n.pinned)
  const unpinned = notes.filter(n => !n.pinned)

  function NoteCard({ n }: { n: QuickNote }) {
    const isEditing = editId === n.id
    const c = isEditing && draft ? draft.color : n.color
    return (
      <div className="card" style={{ background: NOTE_BG[c], cursor: 'pointer', position: 'relative' }}
        onClick={() => !isEditing && startEdit(n)}>
        {isEditing && draft ? (
          <div style={{ padding: 16 }} onClick={e => e.stopPropagation()}>
            <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Titel"
              style={{ background: 'transparent', border: 0, outline: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg)', width: '100%', marginBottom: 8 }} autoFocus />
            <textarea value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} rows={5}
              style={{ background: 'transparent', border: 0, outline: 0, fontSize: 13, color: 'var(--fg-2)', resize: 'none', width: '100%', lineHeight: 1.55 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOR_OPTIONS.map(col => (
                  <button key={col} onClick={() => setDraft({ ...draft, color: col })}
                    style={{ width: 16, height: 16, borderRadius: '50%', background: NOTE_DOT[col],
                      border: `2px solid ${draft.color === col ? 'var(--fg)' : 'transparent'}`, cursor: 'pointer', opacity: draft.color === col ? 1 : 0.5 }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { setEditId(null); setDraft(null) }} style={{ padding: 4, color: 'var(--fg-4)' }}><X size={14} /></button>
                <button onClick={saveEdit} style={{ padding: 4, color: 'var(--accent)' }}><Check size={14} /></button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {n.title && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, paddingRight: 48 }}>{n.title}</div>}
            <div style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.55, WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden', display: '-webkit-box' }}>{n.content}</div>
            <div style={{ fontSize: 10.5, marginTop: 10, color: 'var(--fg-4)' }}>{new Date(n.updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</div>
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
              <button onClick={e => { e.stopPropagation(); togglePin(n) }}
                style={{ padding: 5, borderRadius: 6, background: 'var(--surface-sunk)', color: n.pinned ? 'var(--accent)' : 'var(--fg-4)' }}>
                <Pin size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); deleteMut.mutate(n.id) }}
                style={{ padding: 5, borderRadius: 6, background: 'var(--surface-sunk)', color: 'var(--rose)' }}>
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="content">
      <PageHeader
        eyebrow={`${notes.length} Notizen · ${pinned.length} gepinnt`}
        title="Notizen"
        sub="Der schnellste Weg zwischen Gedanke und Erinnerung."
        action={<button className="btn primary" onClick={() => setCreating(v => !v)}><Plus size={14} /> Neue Notiz</button>}
      />

      {creating && (
        <div className="card" style={{ marginBottom: 16, background: NOTE_BG[newNote.color] }}>
          <div style={{ padding: 16 }}>
            <input value={newNote.title} onChange={e => setNewNote(n => ({ ...n, title: e.target.value }))} placeholder="Titel (optional)" autoFocus
              style={{ background: 'transparent', border: 0, outline: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg)', width: '100%', marginBottom: 8 }} />
            <textarea value={newNote.content} onChange={e => setNewNote(n => ({ ...n, content: e.target.value }))} placeholder="Notiz schreiben…" rows={4}
              style={{ background: 'transparent', border: 0, outline: 0, fontSize: 13, color: 'var(--fg-2)', resize: 'none', width: '100%', lineHeight: 1.55 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLOR_OPTIONS.map(col => (
                  <button key={col} onClick={() => setNewNote(n => ({ ...n, color: col }))}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: NOTE_DOT[col],
                      border: `2px solid ${newNote.color === col ? 'var(--fg)' : 'transparent'}`, cursor: 'pointer', opacity: newNote.color === col ? 1 : 0.5 }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn ghost" onClick={() => setCreating(false)}>Abbrechen</button>
                <button className="btn primary" onClick={() => createMut.mutate(newNote)} disabled={!newNote.content.trim()}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pinned.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Pin size={11} /> Gepinnt
          </div>
          <div className="bento" style={{ marginBottom: 24 }}>
            {pinned.map(n => <div key={n.id} className="col-6"><NoteCard n={n} /></div>)}
          </div>
        </>
      )}

      {unpinned.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: 10 }}>Alle Notizen</div>
          <div className="bento">
            {unpinned.map(n => <div key={n.id} className="col-4"><NoteCard n={n} /></div>)}
          </div>
        </>
      )}

      {notes.length === 0 && !creating && <div className="empty" style={{ padding: 80 }}>Noch keine Notizen. Erstelle deine erste.</div>}
    </div>
  )
}
