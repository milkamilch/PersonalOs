import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, RotateCcw, Settings, Square, Terminal, WifiOff, X } from 'lucide-react'
import { endpoints } from '../api/client'
import type { ServerContainer, ServerMetrics } from '../api/types'

function fmtBytes(b: number) { if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'; if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'; return (b / 1e3).toFixed(0) + ' KB' }
function fmtUptime(s: number) { const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); if (d > 0) return `${d}d ${h}h`; return `${h}h` }

function PageHead({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {action}
    </div>
  )
}

// Simple CPU sparkline (uses random placeholder data since the API gives us current values only)
function Sparkline({ pct, color }: { pct: number; color: string }) {
  const vals = Array.from({ length: 20 }, (_, i) => Math.max(0, pct + (Math.sin(i * 0.7) * 15)))
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1
  const path = 'M ' + vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${38 - ((v - min) / range) * 36 - 1}`).join(' L ')
  const area = `${path} L 100,40 L 0,40 Z`
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: 32 }}>
      <path d={area} fill={`color-mix(in srgb, ${color} 15%, transparent)`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

export default function ServerPage() {
  const qc = useQueryClient()
  const [logsModal, setLogsModal] = useState<{ name: string; logs: string } | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const { data: metrics, isLoading, error } = useQuery<ServerMetrics>({
    queryKey: ['serverMetrics'],
    queryFn: () => endpoints.serverMetrics().then(r => r.data),
    refetchInterval: 30_000,
    retry: false,
  })
  const { data: containers = [] } = useQuery<ServerContainer[]>({
    queryKey: ['serverContainers'],
    queryFn: () => endpoints.serverContainers().then(r => r.data),
    refetchInterval: 30_000,
    retry: false,
  })

  const actionMut = useMutation({
    mutationFn: ({ name, action }: { name: string; action: 'start' | 'stop' | 'restart' }) => endpoints.containerAction(name, action),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['serverContainers'] }); qc.invalidateQueries({ queryKey: ['serverMetrics'] }); setLoadingAction(null) },
    onError: () => setLoadingAction(null),
  })

  const openLogs = async (name: string) => {
    const res = await endpoints.containerLogs(name, 100)
    setLogsModal({ name, logs: res.data.logs ?? '' })
  }

  const cpuPct = metrics ? (metrics.loadAvg1 / metrics.cpuCores) * 100 : 0
  const ramPct = metrics?.memPct ?? 0
  const diskPct = metrics?.diskPct ?? 0
  const running = containers.filter(c => c.state?.toLowerCase() === 'running').length

  return (
    <div className="content">
      <PageHead
        eyebrow={metrics?.host ?? 'VPS · nicht konfiguriert'}
        title="Server"
        sub="Was läuft, läuft. Was nicht, schlägt Alarm."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {metrics?.reachable
              ? <span className="pill success" style={{ height: 32, padding: '0 12px' }}><span className="dot" />Online{metrics.uptimeSeconds ? ` · ${fmtUptime(metrics.uptimeSeconds)}` : ''}</span>
              : <span className="pill danger" style={{ height: 32, padding: '0 12px' }}><WifiOff size={11} /> Offline</span>
            }
            <button className="btn"><Settings size={13} /> Konsole</button>
          </div>
        }
      />

      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /></div>}

      {error && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-b" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <WifiOff size={20} style={{ color: 'var(--rose)' }} />
            <div>
              <div style={{ fontWeight: 500 }}>Keine Verbindung</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>SERVER_HOST oder SSH-Credentials nicht konfiguriert.</div>
            </div>
          </div>
        </div>
      )}

      {metrics && (
        <>
          <div className="bento" style={{ marginBottom: 16 }}>
            <div className="col-3 card">
              <div className="card-b">
                <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 }}>CPU</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span className="display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{cpuPct.toFixed(0)}</span>
                  <span style={{ fontSize: 14, color: 'var(--fg-3)' }}>%</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-4)' }}>{metrics.cpuCores} Cores</span>
                </div>
                <Sparkline pct={cpuPct} color="var(--accent)" />
              </div>
            </div>
            <div className="col-3 card">
              <div className="card-b">
                <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 }}>Speicher</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span className="display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmtBytes(metrics.memUsed)}</span>
                </div>
                <div className="bar"><div className="fill" style={{ width: `${ramPct}%`, background: ramPct > 85 ? 'var(--rose)' : ramPct > 65 ? 'var(--amber)' : 'var(--accent)' }} /></div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 6 }}>{ramPct.toFixed(0)} % · {fmtBytes(metrics.memTotal)} gesamt</div>
              </div>
            </div>
            <div className="col-3 card">
              <div className="card-b">
                <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 }}>Festplatte</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span className="display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{fmtBytes(metrics.diskUsed)}</span>
                </div>
                <div className="bar"><div className="fill" style={{ width: `${diskPct}%`, background: diskPct > 85 ? 'var(--rose)' : diskPct > 65 ? 'var(--amber)' : 'var(--accent)' }} /></div>
                <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 6 }}>{diskPct.toFixed(0)} % · {fmtBytes(metrics.diskTotal)} gesamt</div>
              </div>
            </div>
            <div className="col-3 card">
              <div className="card-b">
                <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 }}>Load</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <span className="display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{metrics.loadAvg1.toFixed(2)}</span>
                  <span style={{ fontSize: 14, color: 'var(--fg-3)' }}>1 min</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'JetBrains Mono' }}>
                  {metrics.loadAvg5.toFixed(2)} / {metrics.loadAvg15.toFixed(2)} <span style={{ color: 'var(--fg-4)' }}>5/15 min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <span className="accent-dot" />
              <span className="title">Container · {running} / {containers.length} laufen</span>
              <div className="spacer" />
              <button className="btn ghost" style={{ height: 28 }} onClick={() => { qc.invalidateQueries({ queryKey: ['serverContainers'] }) }}>↻</button>
            </div>
            <div className="card-b" style={{ padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '12px 1.5fr 2fr 80px 80px auto', gap: 14, padding: '10px 20px',
                fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, borderBottom: '1px solid var(--line)' }}>
                <span /><span>Name</span><span>Image</span><span>Status</span><span>Uptime</span><span>Aktionen</span>
              </div>
              {containers.length === 0 && <div className="empty" style={{ padding: 40 }}>Keine Container gefunden.</div>}
              {containers.map((c, i) => {
                const isRunning = c.state?.toLowerCase() === 'running'
                return (
                  <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '12px 1.5fr 2fr 80px 80px auto', gap: 14, padding: '12px 20px', alignItems: 'center',
                    borderTop: i > 0 ? '1px solid var(--line)' : 'none', opacity: isRunning ? 1 : 0.55 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: isRunning ? 'var(--green)' : 'var(--fg-5)' }} />
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.image}</span>
                    <span style={{ fontSize: 12, color: isRunning ? 'var(--green)' : 'var(--fg-4)', fontWeight: 500 }}>{c.state ?? '—'}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--fg-4)', fontFamily: 'JetBrains Mono' }}>{c.status?.match(/Up (.+)/)?.[1] ?? '—'}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => { setLoadingAction(`${c.name}-start`); actionMut.mutate({ name: c.name, action: 'start' }) }} disabled={loadingAction != null}
                        style={{ padding: '4px 6px', borderRadius: 6, background: 'color-mix(in srgb, var(--green) 12%, transparent)', color: 'var(--green)', cursor: 'pointer' }} title="Start">
                        <Play size={11} />
                      </button>
                      <button onClick={() => { setLoadingAction(`${c.name}-stop`); actionMut.mutate({ name: c.name, action: 'stop' }) }} disabled={loadingAction != null}
                        style={{ padding: '4px 6px', borderRadius: 6, background: 'color-mix(in srgb, var(--rose) 12%, transparent)', color: 'var(--rose)', cursor: 'pointer' }} title="Stop">
                        <Square size={11} />
                      </button>
                      <button onClick={() => { setLoadingAction(`${c.name}-restart`); actionMut.mutate({ name: c.name, action: 'restart' }) }} disabled={loadingAction != null}
                        style={{ padding: '4px 6px', borderRadius: 6, background: 'color-mix(in srgb, var(--amber) 12%, transparent)', color: 'var(--amber)', cursor: 'pointer' }} title="Restart">
                        <RotateCcw size={11} />
                      </button>
                      <button onClick={() => openLogs(c.name)}
                        style={{ padding: '4px 6px', borderRadius: 6, background: 'var(--surface-sunk)', color: 'var(--fg-3)', cursor: 'pointer' }} title="Logs">
                        <Terminal size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {logsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setLogsModal(null)}>
          <div style={{ width: '100%', maxWidth: 720, maxHeight: '80vh', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--line)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <Terminal size={15} style={{ color: 'var(--green)' }} />
              <span style={{ fontWeight: 500, fontSize: 13 }}>{logsModal.name}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setLogsModal(null)} style={{ color: 'var(--fg-4)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <pre style={{ flex: 1, overflow: 'auto', padding: 16, fontSize: 11, fontFamily: 'JetBrains Mono', lineHeight: 1.6, background: '#0d1117', color: '#3fb950', margin: 0 }}>
              {logsModal.logs || '(keine Logs)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
