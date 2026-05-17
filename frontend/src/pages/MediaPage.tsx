import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { endpoints } from '../api/client'
import type { MediaItem, MediaStatus } from '../api/types'

const KIND_E: Record<string, string> = { book: '📖', movie: '🎬', series: '📺' }
const KIND_N: Record<string, string> = { book: 'Buch', movie: 'Film', series: 'Serie' }
const ST_CONFIG: Record<MediaStatus, { c: string; n: string }> = {
  want:        { c: '#9A9A9F', n: 'Watchlist'  },
  in_progress: { c: '#1C6BFF', n: 'Läuft'      },
  done:        { c: '#2F8F4E', n: 'Fertig'      },
  dropped:     { c: '#C8344A', n: 'Abgebrochen' },
}

function PageHead({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {action}
    </div>
  )
}

type Tab = 'all' | 'in_progress' | 'want' | 'done'

export default function MediaPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('all')
  const [typeFilter, setTypeFilter] = useState<'book' | 'movie' | 'series' | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', creator: '', type: 'book' as 'book' | 'movie' | 'series', status: 'want' as MediaStatus })

  const { data: items = [] } = useQuery<MediaItem[]>({
    queryKey: ['media', typeFilter, tab],
    queryFn: () => endpoints.mediaItems({
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
      ...(tab !== 'all' ? { status: tab } : {}),
    }).then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => endpoints.createMedia(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media'] }); setForm({ title: '', creator: '', type: 'book', status: 'want' }); setShowAdd(false) },
  })
  const update = useMutation({
    mutationFn: ({ id, ...b }: { id: number; [key: string]: unknown }) => endpoints.updateMedia(id, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteMedia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })

  const TABS: { v: Tab; l: string }[] = [
    { v: 'all',         l: 'Alle'          },
    { v: 'in_progress', l: 'Läuft gerade'  },
    { v: 'want',        l: 'Watchlist'     },
    { v: 'done',        l: 'Abgeschlossen' },
  ]

  return (
    <div className="content">
      <PageHead
        eyebrow={`${items.length} Einträge`}
        title="Medien"
        sub="Was du konsumierst, formt dich."
        action={<button className="btn primary" onClick={() => setShowAdd(v => !v)}><Plus size={14} /> Hinzufügen</button>}
      />

      {showAdd && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h"><span className="accent-dot" /><span className="title">Neuer Eintrag</span></div>
          <div className="card-b" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titel"
              style={{ flex: 1, minWidth: 160, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <input value={form.creator} onChange={e => setForm({ ...form, creator: e.target.value })} placeholder="Autor / Regisseur"
              style={{ flex: 1, minWidth: 140, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as typeof form.type })}
              style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }}>
              <option value="book">📖 Buch</option>
              <option value="movie">🎬 Film</option>
              <option value="series">📺 Serie</option>
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as MediaStatus })}
              style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }}>
              <option value="want">Watchlist</option>
              <option value="in_progress">Läuft</option>
              <option value="done">Fertig</option>
              <option value="dropped">Abgebrochen</option>
            </select>
            <button className="btn primary" onClick={() => form.title.trim() && create.mutate()}>Anlegen</button>
            <button className="btn ghost" onClick={() => setShowAdd(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 12.5, fontWeight: 500,
            background: tab === t.v ? 'var(--fg)' : 'var(--surface)',
            color: tab === t.v ? 'var(--bg)' : 'var(--fg-3)', border: '1px solid var(--line)', cursor: 'pointer',
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'book', 'movie', 'series'] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: '4px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 500,
            background: typeFilter === t ? 'var(--accent-soft)' : 'transparent',
            color: typeFilter === t ? 'var(--accent)' : 'var(--fg-4)', border: `1px solid ${typeFilter === t ? 'var(--accent)' : 'var(--line)'}`, cursor: 'pointer',
          }}>{t === 'all' ? 'Alle Typen' : KIND_E[t] + ' ' + KIND_N[t]}</button>
        ))}
      </div>

      <div className="bento">
        {items.length === 0 && <div className="col-12"><div className="empty" style={{ padding: 80 }}>Keine Einträge in dieser Kategorie.</div></div>}
        {items.map(m => {
          const st = ST_CONFIG[m.status] ?? ST_CONFIG.want
          return (
            <div key={m.id} className="col-3 card">
              <div style={{ aspectRatio: '2/3', background: `linear-gradient(135deg, ${st.c}1A, var(--surface-sunk))`,
                display: 'grid', placeItems: 'center', fontSize: 48, borderBottom: '1px solid var(--line)' }}>
                {KIND_E[m.type] ?? '🎞️'}
              </div>
              <div className="card-b" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="pill" style={{ background: `${st.c}1A`, color: st.c, fontSize: 10.5 }}>
                    <span className="dot" />{st.n}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{KIND_N[m.type] ?? ''}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 2 }}>{m.title}</div>
                {m.creator && <div style={{ fontSize: 11.5, color: 'var(--fg-4)' }}>{m.creator}</div>}
                {m.rating != null && (
                  <div style={{ fontSize: 13, color: 'var(--amber)', marginTop: 8 }}>
                    {'★'.repeat(m.rating)}<span style={{ color: 'var(--fg-5)' }}>{'★'.repeat(5 - m.rating)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {m.status !== 'done' && (
                    <button className="btn ghost" style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                      onClick={() => update.mutate({ id: m.id, status: 'done' as MediaStatus })}>✓ Fertig</button>
                  )}
                  <button onClick={() => del.mutate(m.id)} style={{ color: 'var(--fg-5)', fontSize: 11, marginLeft: 'auto', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
