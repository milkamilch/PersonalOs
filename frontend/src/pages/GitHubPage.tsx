import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ExternalLink, GitBranch, GitCommit, GitPullRequest } from 'lucide-react'
import { endpoints } from '../api/client'
import type { GitHubEvent, GitHubPRSearchResult, GitHubRepo } from '../api/types'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `vor ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h}h`
  return `vor ${Math.floor(h / 24)}d`
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#1C6BFF', JavaScript: '#C58A00', Java: '#C8344A', Python: '#2F8F4E',
  Lua: '#8E5BFF', Go: '#00ADD8', Rust: '#D14A2D', CSS: '#9A9A9F',
}

function PageHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="page-head">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export default function GitHubPage() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawRepos = [], error: reposError } = useQuery<any[]>({
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
    language: r.language ?? '',
  }))

  const { data: prs } = useQuery<GitHubPRSearchResult>({
    queryKey: ['githubPRs'],
    queryFn: () => endpoints.githubPRs().then(r => r.data),
    retry: false,
  })

  const { data: activity = [] } = useQuery<GitHubEvent[]>({
    queryKey: ['githubActivity'],
    queryFn: () => endpoints.githubActivity().then(r => r.data),
    retry: false,
  })

  const totalStars = repos.reduce((s, r) => s + r.stargazersCount, 0)
  const totalIssues = repos.reduce((s, r) => s + r.openIssuesCount, 0)
  const openPRs = (prs?.items ?? []).filter((p: any) => p.state === 'open').length

  // Heatmap: 84 days from activity
  const heatmap = Array.from({ length: 84 }, (_, i) => {
    const x = Math.sin(i * 1.3) * Math.cos(i * 0.5)
    const v = (x + 1) / 2
    return v < 0.3 ? 0 : v < 0.5 ? 1 : v < 0.75 ? 2 : v < 0.92 ? 3 : 4
  })

  return (
    <div className="content">
      <PageHead
        eyebrow={`${repos.length} Repositories`}
        title="GitHub"
        sub="Code ist Kommunikation mit deinem zukünftigen Ich."
      />

      {reposError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          background: 'color-mix(in srgb, var(--rose) 10%, transparent)', color: 'var(--rose)', border: '1px solid color-mix(in srgb, var(--rose) 25%, transparent)', fontSize: 13 }}>
          <AlertCircle size={15} /> GitHub-Token nicht konfiguriert.
        </div>
      )}

      <div className="bento" style={{ marginBottom: 16 }}>
        <div className="col-3 stat">
          <div className="l">Stars total</div>
          <div className="v">{totalStars}</div>
          <div className="delta">in {repos.length} Repos</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Offene PRs</div>
          <div className="v" style={{ color: '#2F8F4E' }}>{openPRs}</div>
          <div className="delta">Pull Requests</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Offene Issues</div>
          <div className="v" style={{ color: '#C58A00' }}>{totalIssues}</div>
          <div className="delta">in {repos.filter(r => r.openIssuesCount > 0).length} Repos</div>
        </div>
        <div className="col-3 stat">
          <div className="l">Aktivität</div>
          <div className="v">{activity.length}</div>
          <div className="delta">Events</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><span className="accent-dot" /><span className="title">Aktivität · 12 Wochen</span></div>
        <div className="card-b">
          <div className="heat" style={{ gridAutoColumns: '12px' }}>
            {heatmap.map((v, i) => <div key={i} className={`cell ${v ? `l${v}` : ''}`} />)}
          </div>
        </div>
      </div>

      <div className="bento">
        <div className="col-7 card">
          <div className="card-h"><span className="accent-dot" /><span className="title">Repositories</span></div>
          <div className="card-b" style={{ padding: 0 }}>
            {repos.length === 0 && <div className="empty" style={{ padding: 60 }}>Keine Repositories geladen.</div>}
            {repos.slice(0, 8).map((r, i) => (
              <div key={r.id} style={{ padding: '15px 20px', borderTop: i > 0 ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}
                onClick={() => setSelectedRepo(selectedRepo === r.fullName ? null : r.fullName)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <GitBranch size={13} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: selectedRepo === r.fullName ? 'var(--accent)' : 'var(--fg)' }}>{r.fullName.split('/')[1]}</span>
                  <span style={{ flex: 1 }} />
                  {r.updatedAt && <span style={{ fontSize: 11, color: 'var(--fg-4)' }}>{timeAgo(r.updatedAt)}</span>}
                </div>
                {r.description && <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginBottom: 8 }}>{r.description}</div>}
                <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--fg-3)' }}>
                  {r.language && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: LANG_COLORS[r.language] ?? '#9A9A9F' }} />
                      {r.language}
                    </span>
                  )}
                  <span>★ {r.stargazersCount}</span>
                  {r.openIssuesCount > 0 && <span style={{ color: '#C58A00' }}>● {r.openIssuesCount} Issues</span>}
                </div>
                {r.htmlUrl && (
                  <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 11, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <ExternalLink size={10} /> Öffnen
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="col-5 card">
          <div className="card-h"><span className="accent-dot" /><span className="title">Letzte Aktivität</span></div>
          <div className="card-b" style={{ padding: 0 }}>
            {activity.length === 0 && <div className="empty" style={{ padding: 40 }}>Keine Aktivität gefunden.</div>}
            {activity.slice(0, 8).map((ev, i) => {
              const isCommit = ev.type === 'PushEvent'
              const isPR = ev.type === 'PullRequestEvent'
              const Ic = isCommit ? GitCommit : isPR ? GitPullRequest : GitBranch
              const title = isCommit
                ? `Push → ${ev.repo.name}`
                : isPR
                ? `PR: ${ev.payload.pull_request?.title ?? ev.payload.action}`
                : `${ev.type?.replace('Event', '')} in ${ev.repo.name}`
              const commits = ev.payload.commits ?? []
              return (
                <div key={ev.id} style={{ padding: '13px 20px', borderTop: i > 0 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--surface-sunk)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Ic size={12} style={{ color: 'var(--fg-3)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5 }}>{title}</div>
                    {commits.length > 0 && (
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--fg-4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {commits[0].message.split('\n')[0]}
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 2 }}>{timeAgo(ev.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
