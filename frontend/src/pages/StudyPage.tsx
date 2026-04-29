import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Document } from '../api/types'
import PageHeader from '../components/PageHeader'


export default function StudyPage() {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error' | 'dup'; text: string } | null>(null)

  const { data: docs = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => endpoints.documents().then(r => r.data),
  })

  const deleteDoc = useMutation({
    mutationFn: (id: number) => endpoints.deleteDoc(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadMsg(null)
    const form = new FormData()
    form.append('file', file)
    try {
      await endpoints.upload(form)
      qc.invalidateQueries({ queryKey: ['documents'] })
      setUploadMsg({ type: 'success', text: `"${file.name}" erfolgreich hochgeladen.` })
    } catch (err: any) {
      if (err.response?.status === 409) {
        const d = err.response.data
        setUploadMsg({ type: 'dup', text: `Duplikat erkannt: "${d.existingName}" wurde bereits hochgeladen.` })
      } else {
        setUploadMsg({ type: 'error', text: 'Upload fehlgeschlagen.' })
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Lernen" subtitle="Lade Dokumente hoch und verwalte deine Lernmaterialien." />

      {/* Upload zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-700 hover:border-violet-500 rounded-2xl p-12 text-center cursor-pointer transition-colors mb-6"
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
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Wird hochgeladen…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={36} className="text-gray-600" />
            <p className="text-gray-300 font-medium">Datei hierher ziehen oder klicken</p>
            <p className="text-xs text-gray-500">PDF, TXT, DOCX</p>
          </div>
        )}
      </div>

      {uploadMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 text-sm ${
          uploadMsg.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' :
          uploadMsg.type === 'dup' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' :
          'bg-red-900/30 text-red-400 border border-red-800'
        }`}>
          {uploadMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {uploadMsg.text}
        </div>
      )}

      {/* Document list */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Dokumente ({docs.length})
      </h2>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">Noch keine Dokumente hochgeladen.</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3.5 bg-gray-900 border border-gray-800 rounded-xl group hover:border-gray-700 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{doc.name}</p>
                <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString('de-DE')}</p>
              </div>
              <button
                onClick={() => deleteDoc.mutate(doc.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
