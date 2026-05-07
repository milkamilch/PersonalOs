import { useState, useRef, useEffect } from 'react'
import { Search, FileText, MessageSquare, Send, User, Bot } from 'lucide-react'
import { endpoints } from '../api/client'
import type { SearchResult, AskSource } from '../api/types'
import PageHeader from '../components/PageHeader'

type Tab = 'search' | 'ask'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: AskSource[]
  streaming?: boolean
}

// ── Search tab ─────────────────────────────────────────────────────────────
function SearchTab() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const r = await endpoints.search(query)
      setResults(r.data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Suchanfrage eingeben…"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-100 outline-none focus:ring-1 ring-violet-500"
          />
        </div>
        <button
          onClick={doSearch}
          disabled={loading}
          className="px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-sm transition-colors"
        >
          {loading ? '…' : 'Suchen'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-violet-400 flex-shrink-0" />
                <span className="text-xs font-medium text-violet-400">{r.documentName}</span>
                <span className="ml-auto text-xs text-gray-600">Score: {(r.score * 100).toFixed(0)}%</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{r.chunkText}</p>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <p className="text-sm text-gray-600 text-center py-12">Keine Ergebnisse gefunden.</p>
      )}
    </>
  )
}

// ── Ask tab ────────────────────────────────────────────────────────────────
function AskTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || streaming) return

    const question = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setStreaming(true)

    // Add empty assistant message that will be filled by stream
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const response = await fetch('/api/ask/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          sessionId: sessionIdRef.current ?? undefined,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'token') {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + event.text }
                }
                return updated
              })
            } else if (event.type === 'done') {
              if (event.sessionId) sessionIdRef.current = event.sessionId
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    streaming: false,
                    sources: event.sources ?? [],
                  }
                }
                return updated
              })
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: last.content || 'Fehler beim Laden der Antwort.',
            streaming: false,
          }
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  const reset = () => {
    setMessages([])
    sessionIdRef.current = null
  }

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare size={40} className="text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium mb-1">Stell eine Frage zu deinen Skripten</p>
          <p className="text-sm text-gray-600">Claude antwortet auf Basis deiner hochgeladenen Dokumente.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-violet-400" />
                </div>
              )}
              <div className="max-w-[80%]">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-600/20 border border-violet-600/30 text-gray-100 rounded-tr-sm'
                      : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {msg.sources.map((s, j) => (
                      <span
                        key={j}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}
                      >
                        Seite {s.page}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={14} className="text-gray-400" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-800">
        {messages.length > 0 && (
          <button
            onClick={reset}
            className="px-3 py-2.5 text-xs text-gray-600 hover:text-gray-400 transition-colors rounded-xl hover:bg-gray-800"
          >
            Neu
          </button>
        )}
        <div className="relative flex-1">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Frage stellen…"
            disabled={streaming}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none focus:ring-1 ring-violet-500 disabled:opacity-50"
          />
        </div>
        <button
          onClick={send}
          disabled={!input.trim() || streaming}
          className="px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [tab, setTab] = useState<Tab>('search')

  return (
    <div className="p-6 max-w-3xl flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
      <PageHeader
        title="Suche & Fragen"
        subtitle="Durchsuche deine Dokumente oder stelle Fragen per RAG-Chat."
      />

      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-gray-900 border border-gray-800 w-fit">
        {(['search', 'ask'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t ? 'rgba(124,58,237,0.4)' : 'transparent',
              color: tab === t ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
            }}
          >
            {t === 'search' ? 'Suche' : 'Fragen'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tab === 'search' ? <SearchTab /> : <AskTab />}
      </div>
    </div>
  )
}
