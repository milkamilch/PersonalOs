import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '../api/client'
import type { JournalEntry } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Card } from '../components/ui'

const MOODS = [
  { value: 1, emoji: '😔', label: 'Schlecht'      },
  { value: 2, emoji: '😕', label: 'Mäßig'         },
  { value: 3, emoji: '😐', label: 'Okay'           },
  { value: 4, emoji: '😊', label: 'Gut'            },
  { value: 5, emoji: '😄', label: 'Super'          },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }

function moodColor(mood: number) {
  if (mood >= 5) return 'var(--green-fg)'
  if (mood >= 4) return '#30d158'
  if (mood >= 3) return 'var(--yellow-fg)'
  if (mood >= 2) return 'var(--orange-fg)'
  return 'var(--red-fg)'
}

export default function JournalPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<'today' | 'history'>('today')
  const [mood, setMood]       = useState(3)
  const [content, setContent] = useState('')
  const [synced, setSynced]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const { data: today } = useQuery<JournalEntry>({
    queryKey: ['journalToday'],
    queryFn: () => endpoints.journalToday().then(r => r.data),
  })

  const { data: entries = [] } = useQuery<JournalEntry[]>({
    queryKey: ['journalEntries'],
    queryFn: () => endpoints.journalEntries(60).then(r => r.data),
    enabled: view === 'history',
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
    mutationFn: (data: { entryDate: string; mood: number; content: string }) =>
      endpoints.upsertJournal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journalToday'] })
      qc.invalidateQueries({ queryKey: ['journalEntries'] })
      qc.invalidateQueries({ queryKey: ['moodTrend'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const avgMood = moodTrend.length > 0
    ? moodTrend.reduce((s, e) => s + e.mood, 0) / moodTrend.length
    : 0

  return (
    <div className="page-root page-medium">
      <PageHeader title="Journal" subtitle="Ein Moment der Reflektion — täglich." />

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit"
           style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        {(['today','history'] as const).map(t => (
          <button key={t} onClick={() => setView(t)}
                  className="px-5 py-1.5 rounded-[10px] text-sm font-medium transition-all"
                  style={{ background: view === t ? 'var(--bg-surface)' : 'transparent',
                           color: view === t ? 'var(--text-primary)' : 'var(--text-muted)',
                           boxShadow: view === t ? 'var(--shadow-xs)' : 'none' }}>
            {t === 'today' ? 'Heute' : 'Verlauf'}
          </button>
        ))}
      </div>

      {view === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* Left — editor */}
          <div>
            {/* Mood picker */}
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
               style={{ color: 'var(--text-muted)' }}>
              Wie geht es dir heute?
            </p>
            <div className="grid grid-cols-5 gap-2 mb-8">
              {MOODS.map(m => (
                <button key={m.value} onClick={() => setMood(m.value)}
                        className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all"
                        style={{
                          background: mood === m.value ? 'var(--accent-soft)' : 'var(--bg-surface)',
                          border: `1px solid ${mood === m.value ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                          boxShadow: mood === m.value ? '0 0 0 3px rgba(10,132,255,0.1)' : 'none',
                        }}>
                  <span className="text-2xl leading-none">{m.emoji}</span>
                  <span className="text-xs font-medium whitespace-nowrap"
                        style={{ color: mood === m.value ? 'var(--accent-fg)' : 'var(--text-muted)' }}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Entry */}
            <p className="text-xs font-semibold uppercase tracking-widest mb-2"
               style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Was war heute besonders? Was beschäftigt dich? Was bist du dankbar für?"
              rows={10}
              className="w-full rounded-2xl px-5 py-4 text-sm resize-none outline-none transition-all"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                lineHeight: '1.75',
                caretColor: 'var(--accent)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            />

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {content.length} Zeichen
              </span>
              <Button variant={saved ? 'success' : 'primary'} size="sm"
                      loading={save.isPending}
                      onClick={() => save.mutate({ entryDate: todayStr(), mood, content })}>
                {saved ? '✓ Gespeichert' : 'Speichern'}
              </Button>
            </div>
          </div>

          {/* Right — stats */}
          <div className="space-y-4">
            {/* Trend chart */}
            {moodTrend.length > 0 && (
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest mb-4"
                   style={{ color: 'var(--text-muted)' }}>Stimmungsverlauf</p>
                <div className="flex items-end gap-1" style={{ height: 64 }}>
                  {moodTrend.slice(0, 30).reverse().map((e, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-all"
                         style={{ height: `${(e.mood / 5) * 100}%`, background: moodColor(e.mood), opacity: 0.75, minHeight: 4 }} />
                  ))}
                </div>
                <div className="flex justify-between mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>30 Tage</span>
                  <span>Ø {avgMood.toFixed(1)} {MOODS[Math.round(avgMood) - 1]?.emoji}</span>
                </div>
              </Card>
            )}

            {/* Last entries quick view */}
            {entries.slice(0, 5).map(e => (
              <div key={e.id} className="px-4 py-3 rounded-2xl"
                   style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(e.entry_date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span>{MOODS[e.mood - 1]?.emoji}</span>
                </div>
                {e.content && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {e.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.length === 0 && (
            <p className="col-span-3 text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>
              Noch keine Einträge.
            </p>
          )}
          {entries.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {new Date(e.entry_date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="text-xl">{MOODS[e.mood - 1]?.emoji}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {e.content ? (e.content.length > 200 ? e.content.slice(0, 200) + '…' : e.content) : '—'}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
