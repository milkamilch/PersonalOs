import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, RotateCcw, Check, X, Calendar } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Document, Flashcard } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Button, Badge, Spinner, EmptyState } from '../components/ui'

export default function FlashcardsPage() {
  const qc = useQueryClient()
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null)
  const [dueMode, setDueMode] = useState(false)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const { data: docs = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => endpoints.documents().then(r => r.data),
  })

  const { data: cards = [], isLoading } = useQuery<Flashcard[]>({
    queryKey: ['flashcards', selectedDoc, dueMode],
    queryFn: () => dueMode
      ? endpoints.dueCards().then(r => r.data)
      : endpoints.flashcards(selectedDoc!).then(r => r.data),
    enabled: selectedDoc !== null || dueMode,
  })

  const rateCard = useMutation({
    mutationFn: ({ id, known }: { id: number; known: boolean }) => endpoints.rateCard(id, known),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flashcards'] })
      setFlipped(false)
      setIndex(i => i + 1)
    },
  })

  const current = cards[index]
  const done    = index >= cards.length && cards.length > 0

  const nextReviewLabel = (card: Flashcard) => {
    if (!card.nextReview) return null
    const d    = new Date(card.nextReview)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const diff  = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff <= 0) return { text: 'Heute fällig', variant: 'red' as const }
    if (diff === 1) return { text: 'Morgen',       variant: 'yellow' as const }
    return           { text: `in ${diff} Tagen`,  variant: 'green' as const }
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Karteikarten"
        actions={
          <Button
            variant="secondary" size="sm" icon={<Calendar size={13} />}
            onClick={() => { setDueMode(true); setSelectedDoc(null); setIndex(0); setFlipped(false) }}
          >
            Fällige Karten
          </Button>
        }
      />

      {/* Doc selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {docs.map(d => (
          <button
            key={d.id}
            onClick={() => { setSelectedDoc(d.id); setDueMode(false); setIndex(0); setFlipped(false) }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border"
            style={selectedDoc === d.id && !dueMode ? {
              background: 'var(--accent-soft)',
              borderColor: 'var(--accent-border)',
              color: 'var(--accent-fg)',
            } : {
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-muted)',
            }}
          >
            {d.name}
          </button>
        ))}
      </div>

      {!selectedDoc && !dueMode && (
        <EmptyState
          icon={<Brain size={24} />}
          title="Kein Dokument gewählt"
          description="Wähle ein Dokument oder starte mit fälligen Karten."
          action={
            <Button
              variant="secondary" size="sm" icon={<Calendar size={13} />}
              onClick={() => { setDueMode(true); setIndex(0); setFlipped(false) }}
            >
              Fällige Karten starten
            </Button>
          }
        />
      )}

      {(selectedDoc || dueMode) && isLoading && (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      )}

      {(selectedDoc || dueMode) && !isLoading && cards.length === 0 && (
        <EmptyState
          icon={<Check size={24} />}
          title="Keine Karten vorhanden"
          description="Für dieses Dokument wurden noch keine Karten generiert."
        />
      )}

      {(selectedDoc || dueMode) && !isLoading && cards.length > 0 && (
        <>
          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${done ? 100 : (index / cards.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent), #4f46e5)',
                }}
              />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              {done ? `✓ ${cards.length}` : `${index + 1} / ${cards.length}`}
            </span>
          </div>

          {done ? (
            <div className="rounded-2xl p-10 text-center"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)' }}>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                   style={{ background: 'var(--green-soft)', border: '1px solid var(--green-border)' }}>
                <Check size={28} style={{ color: 'var(--green-fg)' }} />
              </div>
              <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Session abgeschlossen!
              </p>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                {cards.length} Karten bearbeitet
              </p>
              <Button
                variant="ghost" size="sm" icon={<RotateCcw size={13} />}
                onClick={() => { setIndex(0); setFlipped(false) }}
              >
                Nochmal
              </Button>
            </div>
          ) : current && (
            <>
              {/* 3-D Flip card */}
              <div
                className="flip-scene cursor-pointer mb-4"
                style={{ height: 260 }}
                onClick={() => setFlipped(f => !f)}
              >
                <div className={`flip-card w-full h-full ${flipped ? 'flipped' : ''}`}>
                  {/* Front */}
                  <div className="flip-face w-full h-full rounded-2xl p-8 flex flex-col"
                       style={{
                         background: 'rgba(255,255,255,0.02)',
                         border: '1px solid var(--border-default)',
                       }}>
                    <span className="text-xs font-medium uppercase tracking-widest mb-4"
                          style={{ color: 'var(--accent-fg)' }}>
                      Frage
                    </span>
                    <p className="text-base leading-relaxed flex-1"
                       style={{ color: 'var(--text-primary)' }}>
                      {current.front}
                    </p>
                    <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      Tippen zum Umdrehen
                    </p>
                  </div>

                  {/* Back */}
                  <div className="flip-face flip-face-back w-full h-full rounded-2xl p-8 flex flex-col"
                       style={{
                         background: 'rgba(124,58,237,0.06)',
                         border: '1px solid var(--accent-border)',
                       }}>
                    <span className="text-xs font-medium uppercase tracking-widest mb-4"
                          style={{ color: 'var(--accent-fg)' }}>
                      Antwort
                    </span>
                    <p className="text-base leading-relaxed flex-1 whitespace-pre-wrap"
                       style={{ color: 'var(--text-primary)' }}>
                      {current.back}
                    </p>
                    {(() => {
                      const label = nextReviewLabel(current)
                      return label ? (
                        <div className="flex justify-end mt-3">
                          <Badge variant={label.variant}>
                            <Calendar size={10} /> {label.text}
                          </Badge>
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              </div>

              {/* Rating buttons */}
              {flipped && (
                <div className="flex gap-3">
                  <Button
                    variant="danger" size="lg"
                    className="flex-1"
                    icon={<X size={16} />}
                    onClick={() => rateCard.mutate({ id: current.id, known: false })}
                    loading={rateCard.isPending}
                  >
                    Nicht gewusst
                  </Button>
                  <Button
                    variant="success" size="lg"
                    className="flex-1"
                    icon={<Check size={16} />}
                    onClick={() => rateCard.mutate({ id: current.id, known: true })}
                    loading={rateCard.isPending}
                  >
                    Gewusst
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
