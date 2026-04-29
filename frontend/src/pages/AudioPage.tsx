import { useState, useRef } from 'react'
import { Mic, Upload, FileAudio, CheckCircle, Loader2, AlertCircle, X } from 'lucide-react'
import { api } from '../api/client'

interface TranscribeResult {
  transcription: string
  ingested: boolean
  documentId?: number
  documentName?: string
  chunks?: number
}

export default function AudioPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TranscribeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const submit = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await api.post('/audio/transcribe', form)
      if (r.data.error) {
        setError(r.data.error)
      } else {
        setResult(r.data)
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Transkription fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
  }

  const accepted = '.mp3,.mp4,.m4a,.wav,.webm,.ogg,.flac'

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(239,68,68,0.1)' }}>
          <Mic size={20} style={{ color: '#f87171' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-100">Audio-Transkription</h1>
          <p className="text-sm text-gray-500">Vorlesung aufnehmen → transkribieren → als Dokument nutzen</p>
        </div>
      </div>

      {!result && (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            className="rounded-2xl p-10 text-center cursor-pointer transition-all mb-4"
            style={{
              background: dragging ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
              border: `2px dashed ${dragging ? 'rgba(239,68,68,0.5)' : file ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accepted}
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileAudio size={36} style={{ color: '#34d399' }} />
                <p className="text-sm font-medium text-gray-200">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                <button
                  onClick={e => { e.stopPropagation(); reset() }}
                  className="mt-1 text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1"
                >
                  <X size={12} /> Entfernen
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <Upload size={36} />
                <p className="text-sm">Audio-Datei hier ablegen oder klicken</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.1)' }}>
                  MP3, MP4, M4A, WAV, WebM, OGG, FLAC · max. 100 MB
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm"
                 style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={!file || loading}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: file && !loading ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${file && !loading ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: file && !loading ? '#fca5a5' : '#4b5563',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Wird transkribiert… (kann 30–60s dauern)
              </>
            ) : (
              <>
                <Mic size={16} />
                Transkribieren & als Dokument speichern
              </>
            )}
          </button>

          <p className="text-xs text-gray-600 text-center mt-3">
            Verwendet OpenAI Whisper. Benötigt <code className="text-gray-500">OPENAI_API_KEY</code>.
          </p>
        </>
      )}

      {result && (
        <div className="space-y-4">
          {result.ingested && (
            <div className="flex items-center gap-3 p-4 rounded-2xl"
                 style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle size={18} style={{ color: '#4ade80' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#4ade80' }}>
                  Als Dokument gespeichert
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {result.documentName} · {result.chunks} Chunks
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-4 py-2.5 flex items-center justify-between"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xs font-semibold text-gray-400">Transkript</span>
              <button
                onClick={() => navigator.clipboard.writeText(result.transcription)}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Kopieren
              </button>
            </div>
            <div className="px-4 py-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {result.transcription || '(Keine Transkription)'}
              </p>
            </div>
          </div>

          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }}
          >
            ← Weitere Datei transkribieren
          </button>
        </div>
      )}
    </div>
  )
}
