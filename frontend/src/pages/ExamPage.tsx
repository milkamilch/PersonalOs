import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, Play, ChevronRight, CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react'
import { endpoints, api } from '../api/client'
import type { Document } from '../api/types'
import { Button, Badge, Card, Textarea, Spinner } from '../components/ui'

interface Question  { question: string; chunkContext: string; chunkId: number; pageHint?: number }
interface EvalResult{ score: number; maxScore: number; feedback: string; modelAnswer: string }
type Phase = 'setup' | 'loading' | 'quiz' | 'result'

export default function ExamPage() {
  const [docId,      setDocId]      = useState<number | null>(null)
  const [count,      setCount]      = useState(5)
  const [phase,      setPhase]      = useState<Phase>('setup')
  const [questions,  setQuestions]  = useState<Question[]>([])
  const [current,    setCurrent]    = useState(0)
  const [answer,     setAnswer]     = useState('')
  const [results,    setResults]    = useState<EvalResult[]>([])
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
      setQuestions(r.data); setCurrent(0); setResults([]); setAnswer(''); setPhase('quiz')
    } catch { setPhase('setup') }
  }

  const submit = async () => {
    const q = questions[current]
    setEvaluating(true)
    try {
      const r = await api.post('/quiz/evaluate', { question: q.question, chunkContext: q.chunkContext, userAnswer: answer })
      const newResults = [...results, r.data as EvalResult]
      setResults(newResults)
      if (current + 1 >= questions.length) { setPhase('result') }
      else { setCurrent(i => i + 1); setAnswer('') }
    } finally { setEvaluating(false) }
  }

  const totalScore = results.reduce((s, r) => s + r.score,    0)
  const maxTotal   = results.reduce((s, r) => s + r.maxScore, 0)
  const pct        = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0

  if (phase === 'setup') return (
    <div className="h-full overflow-y-auto p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
          <GraduationCap size={20} style={{ color: 'var(--accent-fg)' }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Probeklausur</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Claude generiert Fragen und bewertet deine Antworten
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
             style={{ color: 'var(--text-muted)' }}>Dokument</p>
          <div className="space-y-1.5">
            {docs.map(d => (
              <button
                key={d.id}
                onClick={() => setDocId(d.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150"
                style={docId === d.id ? {
                  background: 'var(--accent-soft)',
                  borderColor: 'var(--accent-border)',
                  color: 'var(--accent-fg)',
                } : {
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-muted)',
                }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                     style={{ background: docId === d.id ? 'var(--accent)' : 'var(--border-strong)' }} />
                <span className="text-sm">{d.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
             style={{ color: 'var(--text-muted)' }}>Anzahl Fragen</p>
          <div className="flex gap-2">
            {[3, 5, 8, 10].map(n => (
              <Button
                key={n}
                variant={count === n ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCount(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        <Button
          variant={docId ? 'primary' : 'ghost'}
          size="lg"
          className="w-full"
          disabled={!docId}
          icon={<Play size={15} />}
          onClick={start}
        >
          Klausur starten
        </Button>
      </div>
    </div>
  )

  if (phase === 'loading') return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <Spinner size={36} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Claude generiert {count} Prüfungsfragen…
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Das dauert 20–40 Sekunden</p>
    </div>
  )

  if (phase === 'quiz') {
    const q          = questions[current]
    const prevResult = results[current - 1]
    const prevPct    = prevResult ? prevResult.score / prevResult.maxScore : 0

    return (
      <div className="h-full overflow-y-auto p-6 max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-7">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500"
                 style={{
                   width: `${(current / questions.length) * 100}%`,
                   background: 'linear-gradient(90deg,var(--accent),#4f46e5)',
                 }} />
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {current + 1} / {questions.length}
          </span>
        </div>

        {prevResult && (
          <Card className="mb-5"
                style={{
                  background: prevPct >= 0.6 ? 'var(--green-soft)' : 'var(--red-soft)',
                  borderColor: prevPct >= 0.6 ? 'var(--green-border)' : 'var(--red-border)',
                } as any}>
            <div className="flex items-center gap-2 mb-2">
              {prevPct >= 0.6
                ? <CheckCircle size={15} style={{ color: 'var(--green-fg)' }} />
                : <XCircle    size={15} style={{ color: 'var(--red-fg)' }} />}
              <Badge variant={prevPct >= 0.6 ? 'green' : 'red'}>
                {prevResult.score}/{prevResult.maxScore} Punkte
              </Badge>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {prevResult.feedback}
            </p>
            {prevResult.modelAnswer && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                  Musterlösung anzeigen
                </summary>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {prevResult.modelAnswer}
                </p>
              </details>
            )}
          </Card>
        )}

        <Card className="mb-4">
          {q.pageHint && (
            <Badge variant="neutral" className="mb-3">Seite {q.pageHint}</Badge>
          )}
          <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-primary)' }}>
            {q.question}
          </p>
        </Card>

        <Textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Deine Antwort…"
          rows={6}
          className="mb-4"
        />

        <Button
          variant="primary" size="lg" className="w-full"
          disabled={!answer.trim()}
          loading={evaluating}
          icon={<ChevronRight size={16} />}
          onClick={submit}
        >
          Antwort abgeben
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl">
      <div className="text-center py-8 mb-6">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
             style={{
               background: pct >= 60 ? 'var(--green-soft)' : 'var(--red-soft)',
               border: `1px solid ${pct >= 60 ? 'var(--green-border)' : 'var(--red-border)'}`,
             }}>
          <Trophy size={28} style={{ color: pct >= 60 ? 'var(--green-fg)' : 'var(--red-fg)' }} />
        </div>
        <p className="text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{pct}%</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {totalScore} von {maxTotal} Punkten ·{' '}
          {pct >= 90 ? 'Ausgezeichnet!' : pct >= 75 ? 'Gut!' : pct >= 60 ? 'Bestanden' : 'Weiter üben'}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {questions.map((q, i) => {
          const r    = results[i]
          const pctQ = r ? Math.round((r.score / r.maxScore) * 100) : 0
          return (
            <Card key={i}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm leading-snug flex-1" style={{ color: 'var(--text-secondary)' }}>
                  {q.question}
                </p>
                <Badge variant={pctQ >= 60 ? 'green' : 'red'}>
                  {r?.score}/{r?.maxScore}
                </Badge>
              </div>
              {r && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {r.feedback}
                </p>
              )}
            </Card>
          )
        })}
      </div>

      <Button
        variant="ghost" size="md" className="w-full"
        icon={<RotateCcw size={14} />}
        onClick={() => { setPhase('setup'); setQuestions([]); setResults([]) }}
      >
        Neue Klausur
      </Button>
    </div>
  )
}
