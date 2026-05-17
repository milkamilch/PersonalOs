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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h1 style={{ color: 'var(--fg)', fontWeight: 700, fontSize: 22, margin: 0, fontFamily: 'Inter Tight, Inter, sans-serif' }}>
            PersonalOS
          </h1>
          <p style={{ color: 'var(--fg-4)', fontSize: 14, marginTop: 6, margin: '6px 0 0' }}>
            Passwort eingeben
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Passwort"
            autoFocus
            style={{
              background: 'var(--surface-sunk)',
              border: `1px solid ${error ? 'var(--rose)' : 'var(--line)'}`,
              borderRadius: 10,
              padding: '12px 14px',
              color: 'var(--fg)',
              fontSize: 15,
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <p style={{ color: 'var(--rose)', fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pw}
            style={{
              background: pw && !loading ? 'var(--accent)' : 'var(--surface-sunk)',
              color: pw && !loading ? '#fff' : 'var(--fg-4)',
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
