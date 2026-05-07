import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, Trash2, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Document } from '../api/types'
import PageHeader from '../components/PageHeader'
import { Spinner, EmptyState, Badge } from '../components/ui'

export default function StudyPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'dup'; text: string } | null>(null)

  const { data: docs = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => endpoints.documents().then(r => r.data),
  })

  const deleteDoc = useMutation({
    mutationFn: (id: number) => endpoints.deleteDoc(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const handleUpload = async (file: File) => {
    setUploading(true); setMsg(null)
    const form = new FormData()
    form.append('file', file)
    try {
      await endpoints.upload(form)
      qc.invalidateQueries({ queryKey: ['documents'] })
      setMsg({ type: 'success', text: `"${file.name}" erfolgreich hochgeladen.` })
    } catch (err: any) {
      if (err.response?.status === 409) {
        const d = err.response.data
        setMsg({ type: 'dup', text: `Duplikat: "${d.existingName}" ist bereits vorhanden.` })
      } else {
        setMsg({ type: 'error', text: 'Upload fehlgeschlagen. Bitte erneut versuchen.' })
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader title="Lernen" subtitle="Lade Vorlesungsskripte hoch und verwalte deine Bibliothek." />

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
        onClick={() => !uploading && fileRef.current?.click()}
        className="relative rounded-2xl p-12 text-center transition-all duration-200 mb-5 cursor-pointer"
        style={{
          background: dragOver ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-default)'}`,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.docx"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Wird hochgeladen…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                 style={{
                   background: dragOver ? 'var(--accent-soft)' : 'rgba(255,255,255,0.04)',
                   border: '1px solid var(--border-default)',
                 }}>
              <Upload size={24} style={{ color: dragOver ? 'var(--accent-fg)' : 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                Datei hierher ziehen oder klicken
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                PDF, DOCX oder TXT · max. 100 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl mb-5 text-sm"
             style={{
               background: msg.type === 'success' ? 'var(--green-soft)'
                         : msg.type === 'dup'     ? 'var(--yellow-soft)'
                         :                          'var(--red-soft)',
               border: `1px solid ${msg.type === 'success' ? 'var(--green-border)'
                                   : msg.type === 'dup'     ? 'var(--yellow-border)'
                                   :                          'var(--red-border)'}`,
               color: msg.type === 'success' ? 'var(--green-fg)'
                    : msg.type === 'dup'     ? 'var(--yellow-fg)'
                    :                          'var(--red-fg)',
             }}>
          {msg.type === 'success' ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
           : msg.type === 'dup'   ? <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
           :                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
          {msg.text}
        </div>
      )}

      {/* Document list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}>
          Dokumente
        </h2>
        <Badge variant="neutral">{docs.length}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-[58px] rounded-xl" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="Noch keine Dokumente"
          description="Lade dein erstes Skript hoch, um loszulegen."
        />
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3.5 rounded-xl group transition-all duration-150 hover-lift"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
                <FileText size={15} style={{ color: 'var(--accent-fg)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {doc.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {new Date(doc.uploadedAt).toLocaleDateString('de-DE', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </p>
              </div>
              <button
                onClick={() => deleteDoc.mutate(doc.id)}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red-fg)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
