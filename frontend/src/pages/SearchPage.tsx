import { useState } from 'react'
import { Search, FileText } from 'lucide-react'
import { endpoints } from '../api/client'
import type { SearchResult } from '../api/types'
import PageHeader from '../components/PageHeader'

export default function SearchPage() {
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
    <div className="p-6 max-w-3xl">
      <PageHeader title="Semantische Suche" subtitle="Suche über alle Dokumente mit KI-Embeddings." />

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
    </div>
  )
}
