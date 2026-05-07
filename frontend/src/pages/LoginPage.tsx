import { useState } from 'react'
import { api } from '../api/client'

interface Props {
  onLogin: (key: string) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [pw, setPw]       = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/verify', { key: pw })
      onLogin(pw)
    } catch {
      setError('Falsches Passwort')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 18,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 360,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="text-center mb-8">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h1 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 22, margin: 0 }}>
            PersonalOS
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Passwort eingeben
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Passwort"
            autoFocus
            style={{
              background: 'var(--bg-input)',
              border: `1px solid ${error ? 'var(--red-fg)' : 'var(--border-default)'}`,
              borderRadius: 10,
              padding: '12px 14px',
              color: 'var(--text-primary)',
              fontSize: 15,
              outline: 'none',
              width: '100%',
            }}
          />

          {error && (
            <p style={{ color: 'var(--red-fg)', fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pw}
            style={{
              background: pw && !loading ? 'var(--accent)' : 'var(--bg-elevated)',
              color: pw && !loading ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: 10,
              padding: '12px',
              fontSize: 15,
              fontWeight: 600,
              cursor: pw && !loading ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Prüfe…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
