import { useState, useRef } from 'react'
import { Mic, Upload, FileAudio, CheckCircle, AlertCircle, X } from 'lucide-react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'
import { Button, Card, Badge } from '../components/ui'

interface TranscribeResult {
  transcription: string; ingested: boolean
  documentId?: number; documentName?: string; chunks?: number
}

export default function AudioPage() {
  const [file,     setFile]     = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<TranscribeResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => { setFile(f); setResult(null); setError(null) }
  const reset = () => { setFile(null); setResult(null); setError(null) }

  const submit = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await api.post('/audio/transcribe', form)
      if (r.data.error) setError(r.data.error)
      else setResult(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Transkription fehlgeschlagen.')
    } finally { setLoading(false) }
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl">
      <PageHeader
        title="Audio-Transkription"
        subtitle="Vorlesungen aufnehmen → mit Whisper transkribieren → als Dokument speichern."
      />

      {!result ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => !file && inputRef.current?.click()}
            className="rounded-2xl p-10 text-center transition-all duration-200 mb-4"
            style={{
              background: dragging ? 'rgba(239,68,68,0.06)' : file ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
              border: `2px dashed ${dragging ? 'var(--red-fg)' : file ? 'var(--green-border)' : 'var(--border-default)'}`,
              cursor: file ? 'default' : 'pointer',
            }}
          >
            <input
              ref={inputRef} type="file"
              accept=".mp3,.mp4,.m4a,.wav,.webm,.ogg,.flac"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: 'var(--green-soft)', border: '1px solid var(--green-border)' }}>
                  <FileAudio size={22} style={{ color: 'var(--green-fg)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                <Badge variant="neutral">{(file.size / 1024 / 1024).toFixed(1)} MB</Badge>
                <button
                  onClick={e => { e.stopPropagation(); reset() }}
                  className="flex items-center gap-1 text-xs mt-1 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <X size={11} /> Entfernen
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-default)' }}>
                  <Upload size={22} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Audio-Datei hier ablegen oder klicken
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    MP3, MP4, M4A, WAV, WebM, OGG, FLAC · max. 100 MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl mb-4 text-sm"
                 style={{ background: 'var(--red-soft)', border: '1px solid var(--red-border)', color: 'var(--red-fg)' }}>
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            variant={file ? 'primary' : 'ghost'}
            size="lg" className="w-full"
            disabled={!file}
            loading={loading}
            icon={!loading ? <Mic size={16} /> : undefined}
            onClick={submit}
          >
            {loading ? 'Wird transkribiert… (30–60 Sekunden)' : 'Transkribieren & als Dokument speichern'}
          </Button>

          <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
            Verwendet OpenAI Whisper · benötigt{' '}
            <code className="px-1 py-0.5 rounded text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
              OPENAI_API_KEY
            </code>
          </p>
        </>
      ) : (
        <div className="space-y-4">
          {result.ingested && (
            <Card style={{ background: 'var(--green-soft)', borderColor: 'var(--green-border)' } as any}>
              <div className="flex items-center gap-3">
                <CheckCircle size={18} style={{ color: 'var(--green-fg)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--green-fg)' }}>
                    Als Dokument gespeichert
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {result.documentName} · {result.chunks} Chunks
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card padding="none">
            <div className="px-4 py-3 flex items-center justify-between"
                 style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>
                Transkript
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(result.transcription)}
                className="text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Kopieren
              </button>
            </div>
            <div className="px-4 py-4 max-h-96 overflow-y-auto">
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                 style={{ color: 'var(--text-secondary)' }}>
                {result.transcription || '(Keine Transkription)'}
              </p>
            </div>
          </Card>

          <Button variant="ghost" size="sm" onClick={reset}>
            ← Weitere Datei transkribieren
          </Button>
        </div>
      )}
    </div>
  )
}
