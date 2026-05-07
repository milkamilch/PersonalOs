import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Star, BookOpen, Film, Tv } from 'lucide-react'
import { endpoints } from '../api/client'
import type { MediaItem, MediaStatus } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Input, Select, EmptyState, Badge } from '../components/ui'

const STATUS_LABELS: Record<MediaStatus, string> = {
  want: 'Geplant', in_progress: 'Aktiv', done: 'Fertig', dropped: 'Abgebrochen'
}
import type { BadgeVariant } from '../components/ui'
const STATUS_COLORS: Record<MediaStatus, BadgeVariant> = {
  want: 'neutral', in_progress: 'yellow', done: 'green', dropped: 'red'
}

type Tab = 'book' | 'movie' | 'series'

export default function MediaPage() {
  const qc = useQueryClient()
  const [tab, setTab]     = useState<Tab>('book')
  const [filter, setFilter] = useState<MediaStatus | 'all'>('all')
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle]   = useState('')
  const [newCreator, setNewCreator] = useState('')
  const [newStatus, setNewStatus] = useState<MediaStatus>('want')

  const { data: items = [] } = useQuery<MediaItem[]>({
    queryKey: ['media', tab, filter],
    queryFn: () => endpoints.mediaItems({
      type: tab,
      ...(filter !== 'all' ? { status: filter } : {}),
    }).then(r => r.data),
  })

  const create = useMutation({
    mutationFn: () => endpoints.createMedia({ type: tab, title: newTitle, creator: newCreator, status: newStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media'] }); setNewTitle(''); setNewCreator(''); setShowNew(false) },
  })

  const update = useMutation({
    mutationFn: ({ id, ...b }: { id: number } & object) => endpoints.updateMedia(id, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })

  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteMedia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })

  const TypeIcon = tab === 'book' ? BookOpen : tab === 'movie' ? Film : Tv
  const typeName = tab === 'book' ? 'Bücher' : tab === 'movie' ? 'Filme' : 'Serien'

  return (
    <div className="page-root page-medium">
      <PageHeader
        title="Medien"
        subtitle="Bücher, Filme und Serien — gelesen, geschaut, geplant."
        actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowNew(s => !s)}>Hinzufügen</Button>}
      />

      {/* Type tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
        {(['book','movie','series'] as Tab[]).map(t => {
          const Ic = t === 'book' ? BookOpen : t === 'movie' ? Film : Tv
          const label = t === 'book' ? 'Bücher' : t === 'movie' ? 'Filme' : 'Serien'
          return (
            <button key={t} onClick={() => setTab(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                             color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              <Ic size={13} />{label}
            </button>
          )
        })}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all','want','in_progress','done','dropped'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
                  className="px-3 py-1 rounded-lg text-xs transition-all"
                  style={{ background: filter === s ? 'var(--accent-soft)' : 'rgba(255,255,255,0.03)',
                           color: filter === s ? 'var(--accent-fg)' : 'var(--text-muted)',
                           border: `1px solid ${filter === s ? 'var(--accent-fg)' : 'transparent'}` }}>
            {s === 'all' ? 'Alle' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* New item form */}
      {showNew && (
        <div className="p-4 rounded-2xl mb-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            {typeName === 'Bücher' ? 'Buch hinzufügen' : typeName === 'Filme' ? 'Film hinzufügen' : 'Serie hinzufügen'}
          </p>
          <div className="space-y-2">
            <Input placeholder={tab === 'book' ? 'Titel' : 'Titel'} value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Input placeholder={tab === 'book' ? 'Autor' : 'Regisseur / Studio'} value={newCreator} onChange={e => setNewCreator(e.target.value)} />
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value as MediaStatus)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="primary" size="sm" disabled={!newTitle.trim()} loading={create.isPending} onClick={() => create.mutate()}>Speichern</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 && !showNew && (
        <EmptyState icon={<TypeIcon size={22} />} title={`Keine ${typeName}`}
          description={`Füge ${tab === 'book' ? 'Bücher' : tab === 'movie' ? 'Filme' : 'Serien'} zu deiner Liste hinzu.`} />
      )}

      <div className="space-y-2">
        {items.map(item => (
          <MediaRow key={item.id} item={item}
            onStatusChange={(s) => update.mutate({ id: item.id, ...(s && { status: s }) })}
            onRating={(r) => update.mutate({ id: item.id, ...(r !== undefined && { rating: r }) })}
            onDelete={() => del.mutate(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

function MediaRow({ item, onStatusChange, onRating, onDelete }: {
  item: MediaItem
  onStatusChange: (s: MediaStatus) => void
  onRating: (r: number | null) => void
  onDelete: () => void
}) {
  const [showStatus, setShowStatus] = useState(false)

  return (
    <div className="px-4 py-3 rounded-2xl group transition-all"
         style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
            {item.creator && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— {item.creator}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <button onClick={() => setShowStatus(s => !s)}>
              <Badge variant={STATUS_COLORS[item.status] ?? 'neutral'}>{STATUS_LABELS[item.status]}</Badge>
            </button>
            {item.finished_at && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Fertig {new Date(item.finished_at).toLocaleDateString('de-DE')}
              </span>
            )}
          </div>
          {showStatus && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {(Object.keys(STATUS_LABELS) as MediaStatus[]).map(s => (
                <button key={s} onClick={() => { onStatusChange(s); setShowStatus(false) }}
                        className="px-2 py-0.5 rounded-lg text-xs transition-all"
                        style={{ background: item.status === s ? 'var(--accent-soft)' : 'rgba(255,255,255,0.04)',
                                 color: item.status === s ? 'var(--accent-fg)' : 'var(--text-muted)' }}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Stars */}
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => onRating(item.rating === n ? null : n)}>
                <Star size={13} fill={n <= (item.rating ?? 0) ? '#fbbf24' : 'transparent'}
                      style={{ color: n <= (item.rating ?? 0) ? '#fbbf24' : 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
          <button onClick={onDelete}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ml-1"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
