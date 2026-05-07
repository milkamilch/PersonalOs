import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Star, AlertCircle, ExternalLink, GitPullRequest, Activity, GitCommit } from 'lucide-react'
import { endpoints } from '../api/client'
import type { GitHubRepo, GitHubIssue, GitHubPRSearchResult, GitHubEvent } from '../api/types'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import { Badge } from '../components/ui'

type Tab = 'repos' | 'prs' | 'activity'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `vor ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h}h`
  return `vor ${Math.floor(h / 24)}d`
}

export default function GitHubPage() {
  const [tab, setTab] = useState<Tab>('repos')
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawRepos = [], isLoading: loadingRepos, error: reposError } = useQuery<any[]>({
    queryKey: ['githubRepos'],
    queryFn: () => endpoints.githubRepos().then(r => r.data),
    retry: false,
  })
  const repos: GitHubRepo[] = rawRepos.map((r: any) => ({
    id: r.id,
    fullName: r.full_name ?? r.fullName ?? '',
    description: r.description ?? '',
    stargazersCount: r.stargazers_count ?? r.stargazersCount ?? 0,
    openIssuesCount: r.open_issues_count ?? r.openIssuesCount ?? 0,
    htmlUrl: r.html_url ?? r.htmlUrl ?? '',
    updatedAt: r.updated_at ?? r.updatedAt ?? '',
  }))

  const { data: rawIssues = [], isLoading: loadingIssues } = useQuery<any[]>({
    queryKey: ['githubIssues', selectedRepo],
    queryFn: () => endpoints.githubIssues(selectedRepo!).then(r => r.data),
    enabled: !!selectedRepo,
    retry: false,
  })
  const issues: GitHubIssue[] = rawIssues.map((i: any) => ({
    id: i.id,
    number: i.number,
    title: i.title ?? '',
    state: i.state ?? '',
    htmlUrl: i.html_url ?? i.htmlUrl ?? '',
    createdAt: i.created_at ?? i.createdAt ?? '',
    labels: (i.labels ?? []).map((l: any) => ({ name: l.name, color: l.color })),
  }))

  const { data: prs, isLoading: loadingPRs } = useQuery<GitHubPRSearchResult>({
    queryKey: ['githubPRs'],
    queryFn: () => endpoints.githubPRs().then(r => r.data),
    enabled: tab === 'prs',
    retry: false,
  })

  const { data: activity = [], isLoading: loadingActivity } = useQuery<GitHubEvent[]>({
    queryKey: ['githubActivity'],
    queryFn: () => endpoints.githubActivity().then(r => r.data),
    enabled: tab === 'activity',
    retry: false,
  })

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'repos',    label: 'Repositories', icon: <GitBranch size={14} /> },
    { id: 'prs',      label: 'Pull Requests', icon: <GitPullRequest size={14} /> },
    { id: 'activity', label: 'Aktivität',     icon: <Activity size={14} /> },
  ]

  return (
    <div className="page-root page-wide">
      <PageHeader title="GitHub" subtitle="Repos, PRs und Aktivität im Überblick." />

      {reposError && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm mb-4"
             style={{ background: 'color-mix(in srgb, var(--red) 12%, transparent)', color: 'var(--red)', border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)' }}>
          <AlertCircle size={16} />
          GitHub-Token nicht konfiguriert.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit mb-6" style={{ background: 'var(--bg-elevated)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.id
              ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }
              : { color: 'var(--text-muted)' }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Repos + Issues */}
      {tab === 'repos' && (
        <div className="flex gap-5">
          <div className="w-64 flex-shrink-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Repositories
            </p>
            {loadingRepos
              ? [...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                ))
              : repos.map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo.fullName)}
                    className="w-full text-left p-3 rounded-xl border transition-all"
                    style={selectedRepo === repo.fullName
                      ? { background: 'var(--bg-elevated)', borderColor: 'var(--accent)', color: 'var(--text-primary)' }
                      : { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                  >
                    <p className="text-sm font-medium truncate">{repo.fullName.split('/')[1]}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1"><Star size={10} />{repo.stargazersCount}</span>
                      <span className="flex items-center gap-1"><AlertCircle size={10} />{repo.openIssuesCount}</span>
                    </div>
                  </button>
                ))
            }
          </div>

          <div className="flex-1">
            {!selectedRepo ? (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--text-muted)' }}>
                <GitBranch size={40} className="mb-3 opacity-30" />
                <p className="text-sm">Repository auswählen</p>
              </div>
            ) : loadingIssues ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
                ))}
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Issues — {selectedRepo}
                </p>
                <div className="space-y-2">
                  {issues.map(issue => (
                    <Card key={issue.id}>
                      <div className="flex items-start gap-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono flex-shrink-0"
                              style={{ background: 'color-mix(in srgb, var(--green) 15%, transparent)', color: 'var(--green)' }}>
                          #{issue.number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{issue.title}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {issue.labels.map(l => (
                              <span key={l.name} className="text-xs px-1.5 py-0.5 rounded-full"
                                    style={{ background: `#${l.color}33`, color: `#${l.color}` }}>
                                {l.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <a href={issue.htmlUrl} target="_blank" rel="noopener noreferrer"
                           style={{ color: 'var(--text-muted)' }} className="hover:opacity-70 flex-shrink-0">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </Card>
                  ))}
                  {issues.length === 0 && (
                    <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Keine offenen Issues.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pull Requests */}
      {tab === 'prs' && (
        <div className="space-y-2">
          {loadingPRs
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
              ))
            : (prs?.items ?? []).map((pr: any) => (
                <Card key={pr.id}>
                  <div className="flex items-start gap-3">
                    <GitPullRequest size={16} className="mt-0.5 flex-shrink-0"
                                   style={{ color: pr.state === 'open' ? 'var(--green)' : 'var(--text-muted)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{pr.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {(pr.repository_url ?? '').replace('https://api.github.com/repos/', '') || pr.repository_url} · #{pr.number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={pr.state === 'open' ? 'green' : 'neutral'}>{pr.state}</Badge>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(pr.updated_at ?? pr.updatedAt ?? '')}</span>
                      <a href={pr.html_url ?? pr.htmlUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                         style={{ color: 'var(--text-muted)' }} className="hover:opacity-70">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </Card>
              ))
          }
          {!loadingPRs && (prs?.items ?? []).length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              Keine offenen Pull Requests.
            </p>
          )}
        </div>
      )}

      {/* Activity */}
      {tab === 'activity' && (
        <div className="space-y-2">
          {loadingActivity
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
              ))
            : activity.map(ev => {
                const isCommit = ev.type === 'PushEvent'
                const isPR = ev.type === 'PullRequestEvent'
                const icon = isCommit ? <GitCommit size={14} />
                           : isPR    ? <GitPullRequest size={14} />
                           : <GitBranch size={14} />
                const title = isCommit
                  ? `Push to ${ev.repo.name}${ev.payload.ref ? ` (${ev.payload.ref?.replace('refs/heads/', '')})` : ''}`
                  : isPR
                  ? `PR ${ev.payload.action}: ${ev.payload.pull_request?.title}`
                  : `Created ${ev.payload.ref_type} in ${ev.repo.name}`
                const commits = ev.payload.commits ?? []
                return (
                  <Card key={ev.id}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5" style={{ color: 'var(--accent)' }}>{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{title}</p>
                        {commits.length > 0 && (
                          <p className="text-xs mt-0.5 truncate font-mono"
                             style={{ color: 'var(--text-muted)' }}>
                            {commits[0].message.split('\n')[0]}
                          </p>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(ev.created_at)}
                      </span>
                    </div>
                  </Card>
                )
              })
          }
          {!loadingActivity && activity.length === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              Keine Aktivität gefunden.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
