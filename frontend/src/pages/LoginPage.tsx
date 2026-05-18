/**
 * Login screen — small polish pass.
 *
 * Before: a single 🔒 emoji served as the brand mark, the surface looked
 * generic and the disabled state of the submit button was barely
 * distinguishable from a loading state.
 *
 * After:
 *   • brand mark matches the Sidebar tile ("P" on `var(--fg)`)
 *   • subtle background grain via radial gradient
 *   • clearer focus / disabled / loading states
 *   • aria-live error region
 *   • full-bleed, but the card stays max 380px
 */
import { useState } from 'react'
import { api } from '../api/client'

interface Props {
  onLogin: (key: string) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [pw, setPw]           = useState('')
  const [error, setError]     = useState('')
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

  const canSubmit = pw.length > 0 && !loading

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%), var(--bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div
            aria-hidden
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--fg)', color: 'var(--bg)',
              display: 'grid', placeItems: 'center',
              fontFamily: 'Inter Tight, Inter, sans-serif',
              fontWeight: 600, fontSize: 22, letterSpacing: '-0.04em',
            }}
          >
            P
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontFamily: 'Inter Tight, Inter, sans-serif',
                fontWeight: 600,
                fontSize: 22,
                letterSpacing: '-0.02em',
                margin: 0,
                color: 'var(--fg)',
              }}
            >
              PersonalOS
            </h1>
            <p style={{ color: 'var(--fg-3)', fontSize: 13, margin: '4px 0 0' }}>
              Anmelden, um fortzufahren
            </p>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--fg-4)',
              fontWeight: 500,
            }}
            htmlFor="pos-pw"
          >
            Passwort
          </label>

          <input
            id="pos-pw"
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); if (error) setError('') }}
            placeholder="••••••••"
            autoFocus
            autoComplete="current-password"
            aria-invalid={!!error}
            aria-describedby={error ? 'pos-pw-err' : undefined}
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
              transition: 'border-color 120ms, background 120ms',
            }}
            onFocus={e => {
              e.currentTarget.style.background = 'var(--surface)'
              if (!error) e.currentTarget.style.borderColor = 'var(--line-strong)'
            }}
            onBlur={e => {
              e.currentTarget.style.background = 'var(--surface-sunk)'
              if (!error) e.currentTarget.style.borderColor = 'var(--line)'
            }}
          />

          <div id="pos-pw-err" role="alert" aria-live="polite"
               style={{ minHeight: 18, fontSize: 12.5, color: 'var(--rose)' }}>
            {error}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              background: canSubmit ? 'var(--accent)' : 'var(--surface-sunk)',
              color: canSubmit ? '#fff' : 'var(--fg-4)',
              border: '1px solid ' + (canSubmit ? 'var(--accent)' : 'var(--line)'),
              borderRadius: 10,
              padding: '12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'background 120ms, transform 120ms',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseDown={e => canSubmit && (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp  ={e => (e.currentTarget.style.transform = '')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            {loading && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'pos-spin .9s linear infinite' }}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
                <path d="M12 7a5 5 0 0 0-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            {loading ? 'Prüfe…' : 'Anmelden'}
          </button>
        </form>

        <p style={{ marginTop: 22, fontSize: 11.5, color: 'var(--fg-4)', textAlign: 'center' }}>
          Privater Workspace · nur du
        </p>
      </div>

      <style>{`@keyframes pos-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
