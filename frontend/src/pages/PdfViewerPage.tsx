import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, ExternalLink, AlertCircle } from 'lucide-react'
import { endpoints } from '../api/client'
import type { Document } from '../api/types'

export default function PdfViewerPage() {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  const { data: docs = [] } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => endpoints.documents().then(r => r.data),
  })

  const pdfUrl = selectedDoc ? `/api/documents/${selectedDoc.id}/file` : null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header + doc selector */}
      <div className="flex-shrink-0 p-4 flex items-center gap-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: 'rgba(96,165,250,0.1)' }}>
          <FileText size={16} style={{ color: '#60a5fa' }} />
        </div>
        <span className="text-sm font-semibold text-gray-300 flex-shrink-0">PDF Viewer</span>

        <div className="flex flex-wrap gap-2 ml-2">
          {docs.filter(d => !d.filePath?.startsWith('audio://')).map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDoc(d)}
              className="px-3 py-1 rounded-full text-xs transition-colors"
              style={{
                background: selectedDoc?.id === d.id ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedDoc?.id === d.id ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.07)'}`,
                color: selectedDoc?.id === d.id ? '#93c5fd' : '#6b7280',
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {selectedDoc && pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#9ca3af' }}
          >
            <ExternalLink size={12} />
            Öffnen
          </a>
        )}
      </div>

      {/* Viewer */}
      <div className="flex-1 min-h-0">
        {!selectedDoc && (
          <div className="flex items-center justify-center h-full"
               style={{ color: 'rgba(255,255,255,0.12)' }}>
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Dokument auswählen</p>
            </div>
          </div>
        )}

        {selectedDoc && pdfUrl && (
          <iframe
            key={selectedDoc.id}
            src={pdfUrl}
            className="w-full h-full"
            style={{ border: 'none' }}
            title={selectedDoc.name}
          />
        )}

        {selectedDoc && !pdfUrl && (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-sm"
                 style={{ color: '#f87171' }}>
              <AlertCircle size={16} />
              Datei nicht verfügbar
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
