import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flame, Play, Plus, Square, Trash2 } from 'lucide-react'
import { endpoints } from '../api/client'
import type { MediaItem, ReadingSession, ReadingStats } from '../api/types'

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

function pad(n: number) { return String(n).padStart(2, '0') }

export default function ReadingPage() {
  const qc = useQueryClient()
  const [showLogForm, setShowLogForm] = useState(false)
  const [selectedBook, setSelectedBook] = useState<number | null>(null)
  const [pages, setPages] = useState('')
  const [note, setNote] = useState('')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [running])

  function startTimer() { startRef.current = Date.now() - elapsed * 1000; setRunning(true) }
  function stopTimer() { setRunning(false) }

  const { data: stats } = useQuery<ReadingStats>({ queryKey: ['readingStats'], queryFn: () => endpoints.readingStats().then(r => r.data) })
  const { data: sessions = [] } = useQuery<ReadingSession[]>({ queryKey: ['readingSessions'], queryFn: () => endpoints.readingSessions({ days: 30 }).then(r => r.data) })
  const { data: books = [] } = useQuery<MediaItem[]>({ queryKey: ['mediaBooks'], queryFn: () => endpoints.mediaItems({ type: 'book' }).then(r => r.data) })

  const logMut = useMutation({
    mutationFn: () => endpoints.logReading({ mediaId: selectedBook, pagesRead: parseInt(pages) || 0, minutes: running ? Math.ceil(elapsed / 60) : 0, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['readingSessions'] }); qc.invalidateQueries({ queryKey: ['readingStats'] }); setPages(''); setNote(''); setRunning(false); setElapsed(0); setShowLogForm(false) },
  })
  const del = useMutation({
    mutationFn: (id: number) => endpoints.deleteReadingSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['readingSessions'] }); qc.invalidateQueries({ queryKey: ['readingStats'] }) },
  })

  const inProgress = books.filter(b => b.status === 'in_progress')
  const finished = books.filter(b => b.status === 'done')
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  return (
    <div className="content">
      <PageHead
        eyebrow={`${finished.length} / 10 Bücher in ${new Date().getFullYear()}`}
        title="Lesen"
        sub={'„Wer ein Buch verschlingt, wächst.“'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setShowLogForm(v => !v)}><Plus size={13} /> Session loggen</button>
          </div>
        }
      />

      {showLogForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h"><span className="accent-dot" /><span className="title">Session eintragen</span></div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <select value={selectedBook ?? ''} onChange={e => setSelectedBook(Number(e.target.value) || null)}
              style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }}>
              <option value="">Buch auswählen…</option>
              {inProgress.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              {books.filter(b => b.status !== 'in_progress').map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="mono" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: running ? 'var(--accent)' : 'var(--fg-3)', minWidth: 80 }}>
                {pad(mins)}:{pad(secs)}
              </span>
              {running ? (
                <button className="btn" onClick={stopTimer} style={{ color: 'var(--rose)' }}><Square size={13} /> Stop</button>
              ) : (
                <button className="btn" onClick={startTimer} style={{ color: 'var(--green)' }}><Play size={13} /> Start</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={pages} onChange={e => setPages(e.target.value)} placeholder="Seiten gelesen" type="number"
                style={{ width: 140, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Notiz (optional)"
                style={{ flex: 1, background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 10px', fontSize: 14, outline: 'none', color: 'var(--fg)' }} />
              <button className="btn primary" onClick={() => logMut.mutate()} disabled={!selectedBook && !pages}>Speichern</button>
              <button className="btn ghost" onClick={() => setShowLogForm(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      <div className="bento" style={{ marginBottom: 16 }}>
        <div className="col-3 stat">
          <div className="l">Heute</div>
          <div className="v">{stats?.todayMin ?? 0}<span className="unit">min</span></div>
          <div className="delta">~{Math.round((stats?.todayMin ?? 0) * 0.43)} Seiten</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Diese Woche</div>
          <div className="v">{stats?.weekMin ?? 0}<span className="unit">min</span></div>
          <div className="delta">{stats?.weekPages ?? 0} Seiten</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Streak</div>
          <div className="v" style={{ color: (stats?.streak ?? 0) > 0 ? 'var(--accent)' : undefined }}>{stats?.streak ?? 0}<span className="unit">d</span></div>
          {(stats?.streak ?? 0) > 0 && <div className="delta up"><Flame size={11} /> Aktiv</div>}
        </div>
        <div className="col-3 stat">
          <div className="l">{new Date().getFullYear()} gesamt</div>
          <div className="v">{stats?.yearPages ?? stats?.weekPages ?? 0}</div>
          <div className="delta">Seiten gelesen</div>
        </div>
      </div>

      {inProgress.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h"><span className="accent-dot" /><span className="title">Aktuell am Lesen</span></div>
          <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {inProgress.map(b => {
              const pct = b.total_pages && b.current_page ? b.current_page / b.total_pages : 0
              return (
                <div key={b.id} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 60, height: 88, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                    background: 'repeating-linear-gradient(45deg, var(--surface-sunk) 0, var(--surface-sunk) 4px, var(--bg) 4px, var(--bg) 8px)',
                    border: '1px solid var(--line)' }}>
                    📖
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 2 }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>{b.author}</div>
                    <div className="bar thin"><div className="fill" style={{ width: `${pct * 100}%` }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--fg-4)', fontVariantNumeric: 'tabular-nums' }}>
                      {b.current_page && b.total_pages ? (
                        <><span>Seite {b.current_page} / {b.total_pages}</span><span>{Math.round(pct * 100)} %</span></>
                      ) : <span>Kein Fortschritt</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-h">
          <span className="accent-dot" />
          <span className="title">Letzte Sessions</span>
          <div className="spacer" />
          <span className="meta">{sessions.length} Einträge</span>
        </div>
        <div className="card-b" style={{ padding: 0 }}>
          {sessions.length === 0 && <div className="empty" style={{ padding: 60 }}>Noch keine Sessions geloggt.</div>}
          {sessions.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ width: 56, fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--fg-4)', flexShrink: 0 }}>
                {new Date(s.session_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.book_title}</div>
                {s.note && <div style={{ fontSize: 11.5, color: 'var(--fg-4)', marginTop: 1 }}>{s.note}</div>}
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                {s.pages_read > 0 && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{s.pages_read} Seiten</span>}
                {s.minutes > 0 && <span style={{ fontSize: 12, fontWeight: 600 }}>{s.minutes} min</span>}
              </div>
              <button onClick={() => del.mutate(s.id)} style={{ color: 'var(--fg-5)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-5)')}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
