import { NavLink } from 'react-router-dom'
import { clearApiKey } from '../api/client'
import {
  LayoutDashboard, Target, Users, Repeat2, Wallet, Dumbbell,
  NotebookPen, Clapperboard, BookOpen, Calendar, Sparkles,
  Timer, Clock, StickyNote, CheckSquare, FolderKanban,
  GitBranch, Server, LogOut
} from 'lucide-react'

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Übersicht',     group: 'main' },
  { to: '/goals',        icon: Target,          label: 'Ziele',         group: 'life' },
  { to: '/habits',       icon: Repeat2,         label: 'Gewohnheiten',  group: 'life' },
  { to: '/finance',      icon: Wallet,          label: 'Finanzen',      group: 'life' },
  { to: '/fitness',      icon: Dumbbell,        label: 'Fitness',       group: 'life' },
  { to: '/journal',      icon: NotebookPen,     label: 'Journal',       group: 'life' },
  { to: '/media',        icon: Clapperboard,    label: 'Medien',        group: 'life' },
  { to: '/reading',      icon: BookOpen,        label: 'Lesen',         group: 'life' },
  { to: '/contacts',     icon: Users,           label: 'Kontakte',      group: 'life' },
  { to: '/calendar',     icon: Calendar,        label: 'Kalender',      group: 'work' },
  { to: '/planner-week', icon: Sparkles,        label: 'Wochenplaner',  group: 'work' },
  { to: '/focus',        icon: Timer,           label: 'Fokus',         group: 'work' },
  { to: '/time',         icon: Clock,           label: 'Zeiterfassung', group: 'work' },
  { to: '/notes',        icon: StickyNote,      label: 'Notizen',       group: 'work' },
  { to: '/todos',        icon: CheckSquare,     label: 'Todos',         group: 'work' },
  { to: '/projects',     icon: FolderKanban,    label: 'Projekte',      group: 'work' },
  { to: '/github',       icon: GitBranch,       label: 'GitHub',        group: 'work' },
  { to: '/server',       icon: Server,          label: 'Server',        group: 'work' },
]

const groups = [
  { key: 'main', label: null      },
  { key: 'life', label: 'Leben'   },
  { key: 'work', label: 'Arbeit'  },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      borderRight: '1px solid var(--line)',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 18px 14px' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: 'var(--fg)', color: 'var(--bg)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'Inter Tight', fontWeight: 600, fontSize: 13, letterSpacing: '-0.04em',
          flexShrink: 0,
        }}>P</div>
        <span style={{ fontFamily: 'Inter Tight', fontWeight: 600, fontSize: 14, letterSpacing: '-0.02em' }}>
          PersonalOS <small style={{ color: 'var(--fg-3)', fontWeight: 500, marginLeft: 2 }}>v2</small>
        </span>
      </div>

      {/* Search */}
      <div style={{ margin: '0 12px 14px', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: 32, borderRadius: 9, background: 'var(--surface-sunk)', border: '1px solid transparent', color: 'var(--fg-3)', fontSize: 12.5 }}
        onFocus={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line-strong)' }}
        onBlur={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-sunk)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <input
          placeholder="Suche…"
          style={{ flex: 1, background: 'transparent', border: 0, outline: 0, color: 'var(--fg)', fontSize: 12.5 }}
        />
        <kbd style={{ fontFamily: 'inherit', fontSize: 10.5, padding: '1px 5px', borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--fg-3)' }}>⌘K</kbd>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
        {groups.map(({ key, label }) => {
          const items = nav.filter(n => n.group === key)
          return (
            <div key={key} style={key !== 'main' ? { marginTop: 8 } : {}}>
              {label && (
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', padding: '8px 8px 4px', fontWeight: 500 }}>
                  {label}
                </div>
              )}
              {items.map(({ to, icon: Icon, label: itemLabel }) => (
                <NavLink key={to} to={to} style={{ display: 'block', textDecoration: 'none' }}>
                  {({ isActive }) => (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0 10px', height: 30, borderRadius: 7,
                      color: isActive ? 'var(--fg)' : 'var(--fg-2)',
                      fontSize: 13, fontWeight: isActive ? 500 : 450,
                      background: isActive ? 'var(--surface)' : 'transparent',
                      border: isActive ? '1px solid var(--line)' : '1px solid transparent',
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                      transition: 'background 100ms',
                      marginBottom: 1,
                    }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-sunk)' }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <Icon size={15} strokeWidth={1.6} style={{ color: isActive ? 'var(--accent)' : 'var(--fg-3)', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemLabel}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), #8E5BFF)',
          display: 'grid', placeItems: 'center', color: 'white',
          fontSize: 11, fontWeight: 600, flexShrink: 0,
        }}>L</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Lars</div>
          <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>larswenner00@gmail.com</div>
        </div>
        <button
          onClick={() => { clearApiKey(); window.location.reload() }}
          title="Abmelden"
          style={{ color: 'var(--fg-4)', padding: 4, borderRadius: 6, flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-4)')}
        >
          <LogOut size={13} strokeWidth={1.6} />
        </button>
      </div>
    </aside>
  )
}
