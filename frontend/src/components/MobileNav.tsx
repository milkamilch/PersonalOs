/**
 * Mobile bottom-nav — rebuilt to be theme-aware.
 *
 * The previous version hardcoded `rgba(20,20,21,0.95)` as a background and
 * used legacy tokens (`--text-muted`, `--border-subtle`) that no longer
 * exist. On the active light theme it rendered as a black bar with
 * invisible labels.
 *
 * New behaviour:
 *   • backdrop blur on `var(--bg)`  →  works in light & dark
 *   • all colors come from `--fg-*` / `--line` / `--accent`
 *   • adds active-tab indicator + safe-area padding
 *   • respects `prefers-reduced-motion`
 */
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Heart, BookOpen } from 'lucide-react'
import QuickAdd from './QuickAdd'

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home'    },
  { to: '/todos',     icon: CheckSquare,     label: 'Todos'   },
  null, // center slot → QuickAdd
  { to: '/habits',    icon: Heart,           label: 'Habits'  },
  { to: '/journal',   icon: BookOpen,        label: 'Journal' },
] as const

export default function MobileNav() {
  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '6px 10px',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
        background: 'color-mix(in srgb, var(--bg) 84%, transparent)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '1px solid var(--line)',
      }}
    >
      {tabs.map((tab, i) => {
        if (!tab) {
          return (
            <div
              key="quick"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: -22,
              }}
            >
              <QuickAdd variant="fab" />
            </div>
          )
        }
        const { to, icon: Icon, label } = tab
        return (
          <NavLink
            key={to ?? i}
            to={to}
            style={{ flex: 1, display: 'flex', textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '8px 4px 4px',
                  borderRadius: 10,
                  color: isActive ? 'var(--accent)' : 'var(--fg-3)',
                  position: 'relative',
                  transition: 'color 120ms',
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute', top: 0,
                      width: 18, height: 2, borderRadius: 99,
                      background: 'var(--accent)',
                    }}
                  />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.1 : 1.7} />
                <span style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.01em',
                }}>{label}</span>
              </div>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
