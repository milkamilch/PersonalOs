import { useQuery } from '@tanstack/react-query'
import { Wifi, WifiOff, Clock } from 'lucide-react'
import { endpoints } from '../api/client'
import type { ServerStatus } from '../api/types'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'

export default function ServerPage() {
  const { data: status, isLoading, error } = useQuery<ServerStatus>({
    queryKey: ['serverStatus'],
    queryFn: () => endpoints.serverStatus().then(r => r.data),
    refetchInterval: 30000,
    retry: false,
  })

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Server" subtitle="Status deines Hetzner-Servers." />

      {isLoading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Verbindung wird geprüft…</p>
        </div>
      )}

      {error && (
        <Card>
          <div className="flex items-center gap-3">
            <WifiOff size={20} className="text-red-400" />
            <div>
              <p className="font-medium text-gray-200">Backend nicht konfiguriert</p>
              <p className="text-sm text-gray-500 mt-0.5">SERVER_HOST in der Konfiguration setzen.</p>
            </div>
          </div>
        </Card>
      )}

      {status && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                status.reachable ? 'bg-green-400/10' : 'bg-red-400/10'
              }`}>
                {status.reachable
                  ? <Wifi size={24} className="text-green-400" />
                  : <WifiOff size={24} className="text-red-400" />
                }
              </div>
              <div>
                <p className="font-semibold text-gray-200">{status.host}</p>
                <p className={`text-sm mt-0.5 ${status.reachable ? 'text-green-400' : 'text-red-400'}`}>
                  {status.reachable ? 'Online' : 'Nicht erreichbar'}
                </p>
              </div>
              {status.reachable && status.responseTimeMs !== null && (
                <div className="ml-auto flex items-center gap-1.5 text-sm text-gray-400">
                  <Clock size={14} />
                  {status.responseTimeMs}ms
                </div>
              )}
            </div>
          </Card>

          <div className={`h-2 rounded-full ${status.reachable ? 'bg-green-400' : 'bg-red-500'}`}
               style={{ width: status.reachable ? '100%' : '30%' }} />

          <p className="text-xs text-gray-600">Automatische Aktualisierung alle 30 Sekunden.</p>
        </div>
      )}
    </div>
  )
}
