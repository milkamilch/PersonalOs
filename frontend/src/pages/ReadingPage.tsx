import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, BookOpen, Trash2, Flame } from 'lucide-react'
import { endpoints } from '../api/client'
import type { ReadingSession, ReadingStats, MediaItem } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Card, EmptyState, Input } from '../components/ui'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function ReadingPage() {
  const qc = useQueryClient()
  const [selectedBook, setSelectedBook] = useState<number | null>(null)
  const [pages, setPages] = useState('')
  const [note, setNote]   = useState('')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number>(0)

  // Timer
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [running])

  function startTimer() { startRef.current = Date.now(); setElapsed(0); setRunning(true) }
  function stopTimer()  { setRunning(false) }

  const { data: stats } = useQuery<ReadingStats>({
    queryKey: ['readingStats'],
    queryFn: () => endpoints.readingStats().then(r => r.data),
  })
  const { data: sessions = [] } = useQuery<ReadingSession[]>({
    queryKey: ['readingSessions'],
    queryFn: () => endpoints.readingSessions({ days: 30 }).then(r => r.data),
  })
  const { data: books = [] } = useQuery<MediaItem[]>({
    queryKey: ['mediaBooks'],
    queryFn: () => endpoints.mediaItems({ type: 'book' }).then(r => r.data),
  })

  const logMut = useMutation({
    mutationFn: () => endpoints.logReading({
      mediaId: selectedBook,
      pagesRead: parseInt(pages) || 0,
      minutes: running ? Math.ceil(elapsed / 60) : 0,
      note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['readingSessions'] })
      qc.invalidateQueries({ queryKey: ['readingStats'] })
      setPages(''); setNote(''); setRunning(false); setElapsed(0)
    },
  })
  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteReadingSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['readingSessions'] }); qc.invalidateQueries({ queryKey: ['readingStats'] }) },
  })

  const inProgressBooks = books.filter(b => b.status === 'in_progress')
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className="page-root page-medium">
      <PageHeader title="Lesen" subtitle="Lesezeit und Fortschritt verfolgen." />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Heute', value: `${stats.todayMin}min` },
            { label: 'Diese Woche', value: `${stats.weekMin}min` },
            { label: 'Seiten (7d)', value: stats.weekPages },
            { label: 'Streak', value: stats.streak > 0 ? <span className="flex items-center justify-center gap-1">{stats.streak}<Flame size={14} style={{ color: 'var(--yellow)' }} /></span> : '—' },
          ].map((s, i) => (
            <Card key={i} className="p-3 text-center">
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Session log form */}
      <Card className="p-4 mb-6">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Session eintragen</p>

        {/* Book selector */}
        <select value={selectedBook ?? ''} onChange={e => setSelectedBook(Number(e.target.value) || null)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-3"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
          <option value="">Buch auswählen…</option>
          {inProgressBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          {books.filter(b => b.status !== 'in_progress').length > 0 && (
            <optgroup label="Andere">
              {books.filter(b => b.status !== 'in_progress').map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </optgroup>
          )}
        </select>

        {/* Timer */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 text-center">
            <span className="text-3xl font-mono font-semibold tabular-nums"
                  style={{ color: running ? 'var(--accent)' : 'var(--text-muted)', letterSpacing: '-0.03em' }}>
              {pad(mins)}:{pad(secs)}
            </span>
          </div>
          {running ? (
            <button onClick={stopTimer}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                    style={{ background: 'rgba(255,69,58,0.15)', color: 'var(--red)' }}>
              <Square size={14} /> Stop
            </button>
          ) : (
            <button onClick={startTimer}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                    style={{ background: 'rgba(48,209,88,0.15)', color: 'var(--green)' }}>
              <Play size={14} /> Start
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Input value={pages} onChange={e => setPages(e.target.value)} placeholder="Seiten gelesen" type="number" className="w-36 flex-shrink-0" />
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Notiz (optional)" className="flex-1" />
          <button
            onClick={() => logMut.mutate()}
            disabled={!selectedBook || (!pages && elapsed < 60)}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-all active:scale-95 flex-shrink-0"
            style={{ background: 'var(--accent)', color: '#000' }}>
            Speichern
          </button>
        </div>
      </Card>

      {/* Sessions */}
      {sessions.length === 0 && (
        <EmptyState icon={<BookOpen size={22} />} title="Noch keine Sessions"
          description="Starte einen Timer und trage deine Lesezeit ein." />
      )}

      <div className="space-y-1.5">
        {sessions.map(s => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl group"
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
            <BookOpen size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.book_title}</p>
              {s.note && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.note}</p>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {s.pages_read > 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.pages_read} Seiten</span>}
              {s.minutes > 0 && <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{s.minutes}min</span>}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date(s.session_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
            <button onClick={() => del.mutate(s.id)} className="opacity-0 group-hover:opacity-100 p-1 transition-all"
                    style={{ color: 'var(--red)' }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
