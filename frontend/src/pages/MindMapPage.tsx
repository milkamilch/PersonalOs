import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Map, Download, HelpCircle, MessageSquare, X, Send, Loader2 } from 'lucide-react'
import { endpoints, api } from '../api/client'
import type { Document, QuizQuestion } from '../api/types'
import PageHeader from '../components/PageHeader'

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export default function MindMapPage() {
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizDone, setQuizDone] = useState(false)

  // Node chat state
  const [chatConcept, setChatConcept] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const { data: docs = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => endpoints.documents().then(r => r.data),
  })

  const { data: mindmap, isLoading } = useQuery({
    queryKey: ['mindmap', selectedDoc],
    queryFn: () => endpoints.mindmap(selectedDoc!).then(r => r.data),
    enabled: selectedDoc !== null,
  })

  const generateQuiz = useMutation({
    mutationFn: (concepts: string[]) => endpoints.mindmapQuiz(concepts).then(r => r.data),
    onSuccess: (data) => { setQuizQuestions(data); setQuizAnswers({}); setQuizDone(false) },
  })

  const handleGlossary = async () => {
    if (!selectedDoc) return
    const res = await endpoints.glossary(selectedDoc)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = `glossar-${selectedDoc}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  const extractConcepts = (node: any, concepts: string[] = []): string[] => {
    if (node.label) concepts.push(node.label)
    if (node.children) node.children.forEach((c: any) => extractConcepts(c, concepts))
    return concepts
  }

  const openNodeChat = (concept: string) => {
    setChatConcept(concept)
    setChatMessages([{
      role: 'assistant',
      content: `Ich beantworte deine Fragen zum Konzept **${concept}** basierend auf deinen Skripten.`
    }])
  }

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || !chatConcept) return
    const userMsg: ChatMsg = { role: 'user', content: chatInput }
    const newHistory = [...chatMessages, userMsg]
    setChatMessages(newHistory)
    setChatInput('')
    setChatLoading(true)
    try {
      const r = await api.post('/mindmap/chat', {
        concept: chatConcept,
        message: chatInput,
        history: newHistory.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      })
      setChatMessages(h => [...h, { role: 'assistant', content: r.data.content }])
    } catch {
      setChatMessages(h => [...h, { role: 'assistant', content: 'Fehler beim Verbinden.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const scoreQuiz = () => {
    if (!quizQuestions) return 0
    return quizQuestions.filter((q, i) => quizAnswers[i] === q.correct).length
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <PageHeader
        title="Mind Map"
        actions={
          selectedDoc && mindmap ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const concepts = extractConcepts(mindmap)
                  generateQuiz.mutate(concepts.slice(0, 20))
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
              >
                <HelpCircle size={14} />Quiz
              </button>
              <button
                onClick={handleGlossary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
              >
                <Download size={14} />Glossar
              </button>
            </div>
          ) : null
        }
      />

      {/* Doc selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {docs.map(d => (
          <button
            key={d.id}
            onClick={() => { setSelectedDoc(d.id); setQuizQuestions(null); setChatConcept(null) }}
            className="px-3 py-1.5 rounded-full text-sm transition-colors"
            style={{
              background: selectedDoc === d.id ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedDoc === d.id ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
              color: selectedDoc === d.id ? '#c4b5fd' : '#6b7280',
            }}
          >
            {d.name}
          </button>
        ))}
      </div>

      {!selectedDoc && (
        <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.15)' }}>
          <Map size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Wähle ein Dokument</p>
        </div>
      )}

      {selectedDoc && isLoading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={20} className="text-violet-400 animate-spin" />
          <p className="text-sm text-gray-500">Mind Map wird geladen…</p>
        </div>
      )}

      {/* Two-column layout when chat is open */}
      <div className={`flex gap-4 ${chatConcept ? '' : ''}`}>
        {/* Tree */}
        <div className="flex-1 min-w-0">
          {selectedDoc && mindmap && !isLoading && !quizQuestions && (
            <MindMapTree node={mindmap} onNodeClick={openNodeChat} />
          )}

          {quizQuestions && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-200">Quiz</h2>
                <button onClick={() => setQuizQuestions(null)}
                        className="text-xs text-gray-500 hover:text-gray-300">
                  ← Zurück zur Mind Map
                </button>
              </div>
              <div className="space-y-5">
                {quizQuestions.map((q, qi) => (
                  <div key={qi} className="p-4 rounded-xl"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="font-medium text-gray-200 mb-3 text-sm">{qi + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        const isSelected = quizAnswers[qi] === oi
                        const isCorrect  = q.correct === oi
                        let bg = 'rgba(255,255,255,0.02)', border = 'rgba(255,255,255,0.07)', color = '#9ca3af'
                        if (quizDone && isCorrect)              { bg = 'rgba(34,197,94,0.08)';  border = 'rgba(34,197,94,0.3)';  color = '#4ade80' }
                        else if (quizDone && isSelected)        { bg = 'rgba(239,68,68,0.08)';  border = 'rgba(239,68,68,0.3)';  color = '#f87171' }
                        else if (!quizDone && isSelected)       { bg = 'rgba(124,58,237,0.1)';  border = 'rgba(124,58,237,0.4)'; color = '#c4b5fd' }
                        return (
                          <button key={oi} onClick={() => !quizDone && setQuizAnswers(a => ({ ...a, [qi]: oi }))}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                                  style={{ background: bg, border: `1px solid ${border}`, color }}>
                            {String.fromCharCode(65 + oi)}) {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {!quizDone
                ? <button onClick={() => setQuizDone(true)}
                          className="mt-4 px-6 py-2 rounded-xl text-sm"
                          style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)', color: '#c4b5fd' }}>
                    Auswerten
                  </button>
                : <div className="mt-4 p-4 rounded-xl text-center"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-2xl font-bold text-gray-100">{scoreQuiz()}/{quizQuestions.length}</p>
                    <p className="text-sm text-gray-500 mt-1">richtige Antworten</p>
                  </div>
              }
            </div>
          )}
        </div>

        {/* Node chat panel */}
        {chatConcept && (
          <div className="w-80 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', height: 520 }}>
            <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <MessageSquare size={14} className="text-violet-400" />
              <span className="flex-1 text-sm font-medium text-gray-300 truncate">{chatConcept}</span>
              <button onClick={() => setChatConcept(null)} className="text-gray-600 hover:text-gray-400">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                       style={m.role === 'user' ? {
                         background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#ddd6fe',
                       } : {
                         background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#d1d5db',
                       }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-1 px-2">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                         style={{ background: 'rgba(167,139,250,0.6)', animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="px-3 py-2 flex gap-1.5 flex-shrink-0"
                 style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder={`Frage zu "${chatConcept}"…`}
                className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f6fc' }}
              />
              <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                      className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.4)', color: '#c4b5fd',
                               opacity: !chatInput.trim() || chatLoading ? 0.4 : 1 }}>
                <Send size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MindMapTree({ node, depth = 0, onNodeClick }: {
  node: any; depth?: number; onNodeClick: (concept: string) => void
}) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0
  const colors = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171']
  const color = colors[depth % colors.length]

  return (
    <div className={depth > 0 ? 'ml-5 border-l pl-3' : ''} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1.5 py-0.5 group">
        {hasChildren && (
          <button onClick={() => setOpen(o => !o)} className="text-xs w-4 flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>
            {open ? '▾' : '▸'}
          </button>
        )}
        <span
          className="text-sm font-medium cursor-pointer hover:underline transition-all"
          style={{ color, marginLeft: !hasChildren ? '1rem' : 0 }}
          onClick={() => onNodeClick(node.label)}
          title="Klicken zum Chatten"
        >
          {node.label}
        </span>
        <button
          onClick={() => onNodeClick(node.label)}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
          title="Mit diesem Konzept chatten"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <MessageSquare size={11} />
        </button>
      </div>
      {open && hasChildren && node.children.map((child: any, i: number) => (
        <MindMapTree key={i} node={child} depth={depth + 1} onNodeClick={onNodeClick} />
      ))}
    </div>
  )
}
