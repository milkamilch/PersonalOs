import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, RotateCcw, Check, X, Calendar } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Document, Flashcard } from '../api/types'
import PageHeader from '../components/PageHeader'

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
  const done = index >= cards.length

  const nextReviewLabel = (card: Flashcard) => {
    if (!card.nextReview) return null
    const d = new Date(card.nextReview)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    if (diff <= 0) return { text: 'Fällig', color: 'text-red-400' }
    if (diff === 1) return { text: 'Morgen', color: 'text-yellow-400' }
    return { text: `in ${diff} Tagen`, color: 'text-green-400' }
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title="Karteikarten"
        actions={
          <button
            onClick={() => { setDueMode(true); setSelectedDoc(null); setIndex(0); setFlipped(false) }}
            className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm transition-colors"
          >
            <Calendar size={14} />
            Fällige Karten
          </button>
        }
      />

      {/* Doc selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {docs.map(d => (
          <button
            key={d.id}
            onClick={() => { setSelectedDoc(d.id); setDueMode(false); setIndex(0); setFlipped(false) }}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selectedDoc === d.id && !dueMode
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {!selectedDoc && !dueMode && (
        <div className="text-center text-gray-600 py-16">
          <Brain size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Wähle ein Dokument oder starte mit fälligen Karten.</p>
        </div>
      )}

      {(selectedDoc || dueMode) && isLoading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {(selectedDoc || dueMode) && !isLoading && (
        <>
          <div className="text-sm text-gray-500 mb-4">
            {done ? `Alle ${cards.length} Karten bearbeitet` : `Karte ${index + 1} von ${cards.length}`}
          </div>

          {done ? (
            <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
              <Check size={48} className="mx-auto text-green-400 mb-3" />
              <p className="text-lg font-semibold text-gray-200">Session abgeschlossen!</p>
              <button
                onClick={() => { setIndex(0); setFlipped(false) }}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                <RotateCcw size={14} />
                Nochmal
              </button>
            </div>
          ) : current && (
            <div
              onClick={() => setFlipped(f => !f)}
              className="min-h-64 bg-gray-900 border border-gray-800 rounded-2xl p-8 cursor-pointer hover:border-gray-700 transition-all"
            >
              <div className="text-xs text-gray-600 mb-4 uppercase tracking-wider">
                {flipped ? 'Antwort' : 'Frage'}
              </div>
              <p className="text-gray-100 text-lg leading-relaxed whitespace-pre-wrap">
                {flipped ? current.back : current.front}
              </p>

              {flipped && (() => {
                const label = nextReviewLabel(current)
                return label ? (
                  <div className={`mt-4 text-xs flex items-center gap-1 ${label.color}`}>
                    <Calendar size={12} />
                    Nächste Wiederholung: {label.text}
                  </div>
                ) : null
              })()}
            </div>
          )}

          {!done && flipped && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => rateCard.mutate({ id: current.id, known: false })}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-800 rounded-xl text-red-400 transition-colors"
              >
                <X size={18} />
                Nicht gewusst
              </button>
              <button
                onClick={() => rateCard.mutate({ id: current.id, known: true })}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-900/30 hover:bg-green-900/50 border border-green-800 rounded-xl text-green-400 transition-colors"
              >
                <Check size={18} />
                Gewusst
              </button>
            </div>
          )}

          {!done && !flipped && (
            <p className="text-center text-xs text-gray-600 mt-4">Klicken zum Umdrehen</p>
          )}
        </>
      )}
    </div>
  )
}
