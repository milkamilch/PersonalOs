import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, RotateCcw, Terminal, X, Wifi, WifiOff } from 'lucide-react'
import { endpoints } from '../api/client'
import type { ServerMetrics, ServerContainer } from '../api/types'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import { Badge } from '../components/ui'

function fmtBytes(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function GaugeBar({ label, pct, value }: { label: string; pct: number; value: string }) {
  const color = pct > 85 ? 'var(--red)' : pct > 65 ? 'var(--yellow)' : 'var(--green)'
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)' }} className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</p>
    </div>
  )
}

function StateChip({ state }: { state: string }) {
  const s = state.toLowerCase()
  if (s === 'running') return <Badge variant="green">running</Badge>
  if (s === 'exited')  return <Badge variant="red">exited</Badge>
  if (s === 'paused')  return <Badge variant="yellow">paused</Badge>
  return <Badge variant="neutral">{state}</Badge>
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
    mutationFn: ({ name, action }: { name: string; action: 'start' | 'stop' | 'restart' }) =>
      endpoints.containerAction(name, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['serverContainers'] })
      qc.invalidateQueries({ queryKey: ['serverMetrics'] })
      setLoadingAction(null)
    },
    onError: () => setLoadingAction(null),
  })

  const doAction = (name: string, action: 'start' | 'stop' | 'restart') => {
    setLoadingAction(`${name}-${action}`)
    actionMut.mutate({ name, action })
  }

  const openLogs = async (name: string) => {
    const res = await endpoints.containerLogs(name, 100)
    setLogsModal({ name, logs: res.data.logs ?? '' })
  }

  const cpuPct = metrics ? (metrics.loadAvg1 / metrics.cpuCores) * 100 : 0
  const ramPct = metrics?.memPct ?? 0
  const diskPct = metrics?.diskPct ?? 0

  return (
    <div className="page-root page-wide">
      <PageHeader title="Server" subtitle={metrics?.host ?? 'Hetzner VPS'} />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
               style={{ borderColor: 'var(--accent) transparent var(--accent) var(--accent)' }} />
        </div>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-3">
            <WifiOff size={20} style={{ color: 'var(--red)' }} />
            <div>
              <p className="font-medium">Keine Verbindung</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                SERVER_HOST oder SSH-Credentials nicht konfiguriert.
              </p>
            </div>
          </div>
        </Card>
      )}

      {metrics && (
        <div className="space-y-6">
          {/* Status bar */}
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: metrics.reachable ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--red) 15%, transparent)' }}>
                {metrics.reachable
                  ? <Wifi size={20} style={{ color: 'var(--green)' }} />
                  : <WifiOff size={20} style={{ color: 'var(--red)' }} />}
              </div>
              <div>
                <p className="font-semibold">{metrics.host}</p>
                <p className="text-sm" style={{ color: metrics.reachable ? 'var(--green)' : 'var(--red)' }}>
                  {metrics.reachable ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className="ml-auto text-sm" style={{ color: 'var(--text-muted)' }}>
                Uptime: <span style={{ color: 'var(--text-secondary)' }}>{fmtUptime(metrics.uptimeSeconds)}</span>
              </div>
            </div>
          </Card>

          {/* Resource gauges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4"
                 style={{ color: 'var(--text-muted)' }}>CPU</p>
              <GaugeBar
                label={`Load avg (${metrics.cpuCores} cores)`}
                pct={cpuPct}
                value={`${metrics.loadAvg1.toFixed(2)} / ${metrics.loadAvg5.toFixed(2)} / ${metrics.loadAvg15.toFixed(2)}`}
              />
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4"
                 style={{ color: 'var(--text-muted)' }}>RAM</p>
              <GaugeBar
                label="Speicher"
                pct={ramPct}
                value={`${fmtBytes(metrics.memUsed)} / ${fmtBytes(metrics.memTotal)}`}
              />
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider mb-4"
                 style={{ color: 'var(--text-muted)' }}>Disk</p>
              <GaugeBar
                label="Festplatte"
                pct={diskPct}
                value={`${fmtBytes(metrics.diskUsed)} / ${fmtBytes(metrics.diskTotal)}`}
              />
            </Card>
          </div>

          {/* Containers */}
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4"
               style={{ color: 'var(--text-muted)' }}>Docker Container</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Name', 'Image', 'Status', 'State', 'Actions'].map(h => (
                      <th key={h} className="pb-2 text-left font-medium pr-4"
                          style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {containers.map(c => (
                    <tr key={c.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="py-3 pr-4 font-medium">{c.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{c.image}</td>
                      <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{c.status}</td>
                      <td className="py-3 pr-4"><StateChip state={c.state} /></td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => doAction(c.name, 'start')}
                            disabled={loadingAction != null}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                            style={{ background: 'color-mix(in srgb, var(--green) 15%, transparent)', color: 'var(--green)' }}
                            title="Start"
                          ><Play size={12} /></button>
                          <button
                            onClick={() => doAction(c.name, 'stop')}
                            disabled={loadingAction != null}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                            style={{ background: 'color-mix(in srgb, var(--red) 15%, transparent)', color: 'var(--red)' }}
                            title="Stop"
                          ><Square size={12} /></button>
                          <button
                            onClick={() => doAction(c.name, 'restart')}
                            disabled={loadingAction != null}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
                            style={{ background: 'color-mix(in srgb, var(--yellow) 15%, transparent)', color: 'var(--yellow)' }}
                            title="Restart"
                          ><RotateCcw size={12} /></button>
                          <button
                            onClick={() => openLogs(c.name)}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                            title="Logs"
                          ><Terminal size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {containers.length === 0 && (
                <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Keine Container gefunden
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Logs modal */}
      {logsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.7)' }}
             onClick={() => setLogsModal(null)}>
          <div className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3"
                 style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Terminal size={16} style={{ color: 'var(--green)' }} />
                <span className="font-medium text-sm">{logsModal.name}</span>
              </div>
              <button onClick={() => setLogsModal(null)}
                      className="p-1 rounded-lg hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed"
                 style={{ background: '#0d1117', color: '#3fb950' }}>
              {logsModal.logs || '(keine Logs)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
