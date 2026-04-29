import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Star, AlertCircle, ExternalLink } from 'lucide-react'
import { endpoints } from '../api/client'
import type { GitHubRepo, GitHubIssue } from '../api/types'
import PageHeader from '../components/PageHeader'

export default function GitHubPage() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)

  const { data: repos = [], isLoading: loadingRepos, error: reposError } = useQuery<GitHubRepo[]>({
    queryKey: ['githubRepos'],
    queryFn: () => endpoints.githubRepos().then(r => r.data),
    retry: false,
  })

  const { data: issues = [], isLoading: loadingIssues } = useQuery<GitHubIssue[]>({
    queryKey: ['githubIssues', selectedRepo],
    queryFn: () => endpoints.githubIssues(selectedRepo!).then(r => r.data),
    enabled: !!selectedRepo,
    retry: false,
  })

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="GitHub" subtitle="Repositories und Issues im Überblick." />

      {reposError && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm mb-4">
          <AlertCircle size={16} />
          GitHub-Backend nicht konfiguriert. Bitte GITHUB_TOKEN in der Konfiguration setzen.
        </div>
      )}

      <div className="flex gap-6">
        {/* Repos */}
        <div className="w-64 flex-shrink-0">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Repositories</h3>
          {loadingRepos ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {repos.map(repo => (
                <button
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo.fullName)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedRepo === repo.fullName
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-200 truncate">{repo.fullName.split('/')[1]}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Star size={10} />{repo.stargazersCount}</span>
                    <span className="flex items-center gap-1"><AlertCircle size={10} />{repo.openIssuesCount}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Issues */}
        <div className="flex-1">
          {!selectedRepo ? (
            <div className="text-center text-gray-600 py-16">
              <GitBranch size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Wähle ein Repository aus.</p>
            </div>
          ) : loadingIssues ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Issues — {selectedRepo}
              </h3>
              {issues.map(issue => (
                <div key={issue.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      issue.state === 'open' ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'
                    }`}>
                      #{issue.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200">{issue.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {issue.labels.map(l => (
                          <span
                            key={l.name}
                            className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{ background: `#${l.color}33`, color: `#${l.color}` }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <a href={issue.htmlUrl} target="_blank" rel="noopener noreferrer"
                       className="text-gray-600 hover:text-gray-300 flex-shrink-0">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
              {issues.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-8">Keine offenen Issues.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
