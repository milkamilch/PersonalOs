import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  GraduationCap, Play, ChevronRight, CheckCircle,
  XCircle, RotateCcw, Loader2, Trophy
} from 'lucide-react'
import { endpoints, api } from '../api/client'
import type { Document } from '../api/types'

interface Question {
  question: string
  chunkContext: string
  chunkId: number
  pageHint?: number
}

interface EvalResult {
  score: number
  maxScore: number
  feedback: string
  modelAnswer: string
}

type Phase = 'setup' | 'loading' | 'quiz' | 'result'

export default function ExamPage() {
  const [docId, setDocId] = useState<number | null>(null)
  const [count, setCount] = useState(5)
  const [phase, setPhase] = useState<Phase>('setup')
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [results, setResults] = useState<EvalResult[]>([])
  const [evaluating, setEvaluating] = useState(false)

  const { data: docs = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => endpoints.documents().then(r => r.data),
  })

  const start = async () => {
    if (!docId) return
    setPhase('loading')
    try {
      const r = await api.get(`/quiz/generate?documentId=${docId}&count=${count}`)
      setQuestions(r.data)
      setCurrent(0)
      setResults([])
      setAnswer('')
      setPhase('quiz')
    } catch {
      setPhase('setup')
    }
  }

  const submit = async () => {
    const q = questions[current]
    setEvaluating(true)
    try {
      const r = await api.post('/quiz/evaluate', {
        question: q.question,
        chunkContext: q.chunkContext,
        userAnswer: answer,
      })
      const newResults = [...results, r.data as EvalResult]
      setResults(newResults)
      if (current + 1 >= questions.length) {
        setPhase('result')
      } else {
        setCurrent(i => i + 1)
        setAnswer('')
      }
    } finally {
      setEvaluating(false)
    }
  }

  const totalScore = results.reduce((s, r) => s + r.score, 0)
  const maxTotal   = results.reduce((s, r) => s + r.maxScore, 0)
  const pct        = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0

  // ── Setup ────────────────────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <GraduationCap size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-100">Probeklausur</h1>
          <p className="text-sm text-gray-500">Claude generiert Fragen & bewertet deine Antworten</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            Dokument wählen
          </label>
          <div className="space-y-2">
            {docs.map(d => (
              <button
                key={d.id}
                onClick={() => setDocId(d.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                style={{
                  background: docId === d.id ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                  borderColor: docId === d.id ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)',
                  color: docId === d.id ? '#c4b5fd' : '#9ca3af',
                }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                     style={{ background: docId === d.id ? '#7c3aed' : '#374151' }} />
                <span className="text-sm">{d.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            Anzahl Fragen
          </label>
          <div className="flex gap-2">
            {[3, 5, 8, 10].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: count === n ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${count === n ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: count === n ? '#c4b5fd' : '#9ca3af',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={start}
          disabled={!docId}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all mt-4"
          style={{
            background: docId ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${docId ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
            color: docId ? '#c4b5fd' : '#6b7280',
          }}
        >
          <Play size={16} />
          Klausur starten
        </button>
      </div>
    </div>
  )

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <Loader2 size={36} className="text-violet-400 animate-spin" />
      <p className="text-sm text-gray-400">Claude generiert {count} Prüfungsfragen…</p>
      <p className="text-xs text-gray-600">Das kann 20–40 Sekunden dauern</p>
    </div>
  )

  // ── Quiz ──────────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const q = questions[current]
    const prevResult = results[current - 1]

    return (
      <div className="h-full overflow-y-auto p-6 max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500"
                 style={{
                   width: `${(current / questions.length) * 100}%`,
                   background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                 }} />
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {current + 1} / {questions.length}
          </span>
        </div>

        {/* Previous result feedback */}
        {prevResult && (
          <div className="mb-4 p-4 rounded-xl border"
               style={{
                 background: prevResult.score / prevResult.maxScore >= 0.6
                   ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                 borderColor: prevResult.score / prevResult.maxScore >= 0.6
                   ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
               }}>
            <div className="flex items-center gap-2 mb-2">
              {prevResult.score / prevResult.maxScore >= 0.6
                ? <CheckCircle size={16} className="text-green-400" />
                : <XCircle size={16} className="text-red-400" />}
              <span className="text-sm font-semibold"
                    style={{ color: prevResult.score / prevResult.maxScore >= 0.6 ? '#4ade80' : '#f87171' }}>
                {prevResult.score}/{prevResult.maxScore} Punkte
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{prevResult.feedback}</p>
            {prevResult.modelAnswer && (
              <details className="mt-2">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">
                  Musterlösung anzeigen
                </summary>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{prevResult.modelAnswer}</p>
              </details>
            )}
          </div>
        )}

        {/* Question */}
        <div className="p-5 rounded-xl mb-4"
             style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {q.pageHint && (
            <p className="text-xs text-gray-600 mb-2">Seite {q.pageHint}</p>
          )}
          <p className="text-base text-gray-100 leading-relaxed font-medium">{q.question}</p>
        </div>

        {/* Answer */}
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Deine Antwort…"
          rows={6}
          className="w-full rounded-xl p-4 text-sm text-gray-200 outline-none resize-none mb-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />

        <button
          onClick={submit}
          disabled={!answer.trim() || evaluating}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: answer.trim() && !evaluating ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${answer.trim() && !evaluating ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
            color: answer.trim() && !evaluating ? '#c4b5fd' : '#6b7280',
          }}
        >
          {evaluating
            ? <><Loader2 size={16} className="animate-spin" /> Wird bewertet…</>
            : <><ChevronRight size={16} /> Antwort abgeben</>}
        </button>
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl">
      <div className="text-center py-6 mb-6">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
             style={{ background: pct >= 60 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
          <Trophy size={32} style={{ color: pct >= 60 ? '#4ade80' : '#f87171' }} />
        </div>
        <p className="text-4xl font-bold text-gray-100 mb-1">{pct}%</p>
        <p className="text-sm text-gray-500">
          {totalScore} von {maxTotal} Punkten ·{' '}
          {pct >= 90 ? '🎉 Ausgezeichnet!' : pct >= 75 ? '👍 Gut!' : pct >= 60 ? '✓ Bestanden' : '📚 Mehr lernen'}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {questions.map((q, i) => {
          const r = results[i]
          const pctQ = r ? Math.round((r.score / r.maxScore) * 100) : 0
          return (
            <div key={i} className="p-4 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm text-gray-300 leading-snug flex-1">{q.question}</p>
                <span className="text-sm font-semibold flex-shrink-0"
                      style={{ color: pctQ >= 60 ? '#4ade80' : '#f87171' }}>
                  {r?.score}/{r?.maxScore}
                </span>
              </div>
              {r && <p className="text-xs text-gray-500 leading-relaxed">{r.feedback}</p>}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => { setPhase('setup'); setQuestions([]); setResults([]) }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#9ca3af',
        }}
      >
        <RotateCcw size={15} />
        Neue Klausur
      </button>
    </div>
  )
}
