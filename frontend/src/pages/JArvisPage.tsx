import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { api } from '../api/client'
import JArvisOrb from '../components/JArvisOrb'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function JArvisPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hallo! Ich bin JArvis, dein KI-Assistent. Was kann ich für dich tun?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [muted, setMuted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const r = await api.post('/jarvis/chat', { messages: history })
      const reply: string = r.data.content ?? JSON.stringify(r.data)
      setMessages(m => [...m, { role: 'assistant', content: reply }])
      if (!muted && 'speechSynthesis' in window) {
        const utt = new SpeechSynthesisUtterance(reply)
        utt.lang = 'de-DE'
        utt.rate = 1.05
        speechSynthesis.speak(utt)
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Entschuldigung, Verbindungsfehler.' }])
    } finally {
      setLoading(false)
    }
  }

  const startListening = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.lang = 'de-DE'
    recognition.interimResults = false
    recognition.onresult = (e: any) => send(e.results[0][0].transcript)
    recognition.onend = () => setListening(false)
    recognition.start()
    setListening(true)
  }

  return (
    <div className="flex h-full" style={{ background: '#050308' }}>
      {/* Left panel — Orb */}
      <div className="w-80 flex-shrink-0 flex flex-col items-center justify-center border-r border-amber-900/30 relative overflow-hidden">
        {/* ambient background glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, rgba(120,60,0,0.15) 0%, transparent 70%)'
        }} />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <JArvisOrb size={240} pulsing={loading} />

          <div className="text-center">
            <h2 className="text-lg font-bold tracking-widest uppercase"
                style={{ color: '#ffb800', textShadow: '0 0 20px rgba(255,180,0,0.5)' }}>
              JArvis
            </h2>
            <p className="text-xs tracking-wider mt-0.5"
               style={{ color: 'rgba(255,160,0,0.5)' }}>
              {loading ? 'VERARBEITET…' : listening ? 'HÖRT ZU…' : 'BEREIT'}
            </p>
          </div>

          {/* Status ring */}
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  background: loading
                    ? `rgba(255,${150 + i * 20},0,${0.4 + 0.15 * Math.sin(Date.now() / 200 + i)})`
                    : i < 3 ? 'rgba(255,180,0,0.7)' : 'rgba(255,180,0,0.2)',
                  boxShadow: i < 3 ? '0 0 6px rgba(255,160,0,0.5)' : 'none'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
             style={{ borderColor: 'rgba(255,160,0,0.15)' }}>
          <div>
            <p className="text-xs tracking-widest uppercase"
               style={{ color: 'rgba(255,160,0,0.5)' }}>
              J.A.R.V.I.S. — Chat
            </p>
          </div>
          <button
            onClick={() => setMuted(m => !m)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: muted ? 'rgba(255,100,0,0.5)' : 'rgba(255,180,0,0.7)' }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full flex-shrink-0 mr-2 mt-0.5 overflow-hidden border"
                     style={{ borderColor: 'rgba(255,160,0,0.4)' }}>
                  <div className="w-full h-full"
                       style={{ background: 'radial-gradient(circle at 40% 40%, #ffcc00, #ff6600)' }} />
                </div>
              )}
              <div
                className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={m.role === 'user' ? {
                  background: 'rgba(255,140,0,0.15)',
                  border: '1px solid rgba(255,160,0,0.3)',
                  color: '#ffe0a0',
                  borderRadius: '18px 18px 4px 18px',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,160,0,0.12)',
                  color: '#e5d5b0',
                  borderRadius: '18px 18px 18px 4px',
                }}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start items-center gap-2">
              <div className="w-6 h-6 rounded-full flex-shrink-0 border"
                   style={{ borderColor: 'rgba(255,160,0,0.4)',
                            background: 'radial-gradient(circle at 40% 40%, #ffcc00, #ff6600)' }} />
              <div className="px-4 py-2.5 rounded-2xl"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,160,0,0.12)' }}>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                         style={{ background: 'rgba(255,180,0,0.8)', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t" style={{ borderColor: 'rgba(255,160,0,0.15)' }}>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Sprich mit JArvis…"
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{
                background: 'rgba(255,160,0,0.08)',
                border: '1px solid rgba(255,160,0,0.25)',
                color: '#ffe0a0',
              }}
            />
            <button
              onClick={startListening}
              className="p-2.5 rounded-xl border transition-colors"
              style={listening ? {
                background: 'rgba(255,50,0,0.3)',
                border: '1px solid rgba(255,80,0,0.6)',
                color: '#ff8866',
              } : {
                background: 'rgba(255,160,0,0.08)',
                border: '1px solid rgba(255,160,0,0.25)',
                color: 'rgba(255,180,0,0.7)',
              }}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl transition-colors"
              style={{
                background: 'rgba(255,160,0,0.2)',
                border: '1px solid rgba(255,160,0,0.4)',
                color: '#ffcc44',
                opacity: (!input.trim() || loading) ? 0.4 : 1,
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
