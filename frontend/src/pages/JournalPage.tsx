import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { endpoints } from '../api/client'
import type { JournalEntry } from '../api/types'

const MOOD_E = ['', '😞', '😕', '🙂', '😊', '😄']
const MOODS = [
  { value: 1, emoji: '😞', label: 'Schlecht' },
  { value: 2, emoji: '😕', label: 'Mäßig' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Gut' },
  { value: 5, emoji: '😄', label: 'Super' },
]

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

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function JournalPage() {
  const qc = useQueryClient()
  const [showEditor, setShowEditor] = useState(false)
  const [mood, setMood] = useState(3)
  const [content, setContent] = useState('')
  const [synced, setSynced] = useState(false)
  const [saved, setSaved] = useState(false)

  const { data: today } = useQuery<JournalEntry>({
    queryKey: ['journalToday'],
    queryFn: () => endpoints.journalToday().then(r => r.data),
  })
  const { data: entries = [] } = useQuery<JournalEntry[]>({
    queryKey: ['journalEntries'],
    queryFn: () => endpoints.journalEntries(60).then(r => r.data),
  })
  const { data: moodTrend = [] } = useQuery<{ entry_date: string; mood: number }[]>({
    queryKey: ['moodTrend'],
    queryFn: () => endpoints.moodTrend().then(r => r.data),
  })

  useEffect(() => {
    if (today && !synced) {
      setMood(today.mood ?? 3)
      setContent(today.content ?? '')
      setSynced(true)
    }
  }, [today, synced])

  const save = useMutation({
    mutationFn: (data: { entryDate: string; mood: number; content: string }) => endpoints.upsertJournal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journalToday'] })
      qc.invalidateQueries({ queryKey: ['journalEntries'] })
      qc.invalidateQueries({ queryKey: ['moodTrend'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setShowEditor(false)
    },
  })

  const trend14 = moodTrend.slice(-14)
  const avgMood = trend14.length > 0 ? trend14.reduce((s, e) => s + e.mood, 0) / trend14.length : 0
  const sparkPath = (() => {
    if (trend14.length < 2) return ''
    return 'M ' + trend14.map((e, i) => `${(i / (trend14.length - 1)) * 100},${48 - ((e.mood - 1) / 4) * 42 - 3}`).join(' L ')
  })()
  const areaPath = sparkPath ? `${sparkPath} L 100,50 L 0,50 Z` : ''

  return (
    <div className="content">
      <PageHead
        eyebrow={`${entries.length} Einträge`}
        title="Journal"
        sub="Reflexion ist der Hebel der Veränderung."
        action={<button className="btn primary" onClick={() => setShowEditor(v => !v)}><Plus size={14} /> Neuer Eintrag</button>}
      />

      {showEditor && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-h">
            <span className="accent-dot" />
            <span className="title">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {MOODS.map(m => (
                <button key={m.value} onClick={() => setMood(m.value)}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 0', borderRadius: 10,
                    background: mood === m.value ? 'var(--accent-soft)' : 'var(--surface-sunk)',
                    border: `1.5px solid ${mood === m.value ? 'var(--accent)' : 'var(--line)'}`, cursor: 'pointer' }}>
                  <span style={{ fontSize: 20 }}>{m.emoji}</span>
                  <span style={{ fontSize: 10.5, color: mood === m.value ? 'var(--accent)' : 'var(--fg-4)', fontWeight: 500 }}>{m.label}</span>
                </button>
              ))}
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Was war heute besonders? Was beschäftigt dich? Wofür bist du dankbar?"
              rows={6}
              style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line-strong)', borderRadius: 10, padding: '10px 14px', fontSize: 14, resize: 'vertical', outline: 'none', color: 'var(--fg)', lineHeight: 1.65 }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn primary" onClick={() => save.mutate({ entryDate: todayStr(), mood, content })}>
                {saved ? '✓ Gespeichert' : 'Speichern'}
              </button>
              <button className="btn ghost" onClick={() => setShowEditor(false)}>Abbrechen</button>
              <span style={{ fontSize: 11.5, color: 'var(--fg-4)', marginLeft: 'auto' }}>{content.length} Zeichen</span>
            </div>
          </div>
        </div>
      )}

      <div className="bento" style={{ marginBottom: 16 }}>
        <div className="col-4 card">
          <div className="card-b">
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Heute</div>
            {today ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <span style={{ fontSize: 36 }}>{MOOD_E[today.mood ?? 3]}</span>
                <div>
                  <div className="display" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
                    {today.mood ?? 3}<small style={{ fontSize: 13, color: 'var(--fg-3)' }}>/5</small>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                    {today.content ? today.content.slice(0, 40) + (today.content.length > 40 ? '…' : '') : 'Kein Text'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16, color: 'var(--fg-4)', fontSize: 13 }}>Noch kein Eintrag heute.</div>
            )}
          </div>
        </div>
        <div className="col-8 card">
          <div className="card-h">
            <span className="accent-dot" />
            <span className="title">Stimmungsverlauf · 14 Tage</span>
            <div className="spacer" />
            {avgMood > 0 && <span className="meta">Schnitt {avgMood.toFixed(1)} / 5</span>}
          </div>
          <div className="card-b" style={{ padding: '12px 20px' }}>
            {sparkPath ? (
              <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: 56 }}>
                <path d={areaPath} fill="var(--accent-soft)" />
                <path d={sparkPath} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
              </svg>
            ) : (
              <div className="empty">Noch nicht genug Daten für den Verlauf.</div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="accent-dot" />
          <span className="title">Letzte Einträge</span>
        </div>
        <div className="card-b" style={{ padding: 0 }}>
          {entries.length === 0 && <div className="empty" style={{ padding: 60 }}>Noch keine Einträge.</div>}
          {entries.slice(0, 20).map((e, i) => (
            <div key={e.id} style={{ padding: '20px', borderTop: i > 0 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 20 }}>
              <div style={{ width: 100, flexShrink: 0 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--fg-4)' }}>
                  {new Date(e.entry_date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </div>
                <div style={{ fontSize: 24, marginTop: 6 }}>{MOOD_E[e.mood ?? 3]}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: 'var(--fg-2)', lineHeight: 1.55 }}>
                  {e.content ? (e.content.length > 240 ? e.content.slice(0, 240) + '…' : e.content) : <span style={{ color: 'var(--fg-5)' }}>Kein Text</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
