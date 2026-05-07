import { NavLink } from 'react-router-dom'
import QuickAdd from './QuickAdd'
import { clearApiKey } from '../api/client'
import { LogOut } from 'lucide-react'
import {
  BookOpen, Brain, Map, Search, LayoutDashboard,
  FolderKanban, CheckSquare, GitBranch, Server,
  GraduationCap, CalendarDays, Mic, FileText,
  Repeat2, Wallet, Dumbbell, Clapperboard, Target, NotebookPen, Timer, Calendar, StickyNote, Clock, Users, Sparkles
} from 'lucide-react'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    group: 'main'  },
  { to: '/goals',     icon: Target,          label: 'Ziele',        group: 'life'  },
  { to: '/contacts',  icon: Users,           label: 'Kontakte',     group: 'life'  },
  { to: '/habits',    icon: Repeat2,         label: 'Gewohnheiten', group: 'life'  },
  { to: '/finance',   icon: Wallet,          label: 'Finanzen',     group: 'life'  },
  { to: '/fitness',   icon: Dumbbell,        label: 'Fitness',      group: 'life'  },
  { to: '/journal',   icon: NotebookPen,     label: 'Journal',      group: 'life'  },
  { to: '/media',     icon: Clapperboard,    label: 'Medien',       group: 'life'  },
  { to: '/reading',   icon: BookOpen,        label: 'Lesen',        group: 'life'  },
  { to: '/calendar',  icon: Calendar,        label: 'Kalender',     group: 'work'  },
  { to: '/planner-week', icon: Sparkles,    label: 'Wochenplaner', group: 'work'  },
  { to: '/focus',     icon: Timer,           label: 'Fokus',        group: 'work'  },
  { to: '/time',      icon: Clock,           label: 'Zeiterfassung',group: 'work'  },
  { to: '/notes',     icon: StickyNote,      label: 'Notizen',      group: 'work'  },
  { to: '/todos',     icon: CheckSquare,     label: 'Todos',        group: 'work'  },
  { to: '/projects',  icon: FolderKanban,    label: 'Projekte',     group: 'work'  },
  { to: '/github',    icon: GitBranch,       label: 'GitHub',       group: 'work'  },
  { to: '/server',    icon: Server,          label: 'Server',       group: 'work'  },
  { to: '/study',     icon: BookOpen,        label: 'Lernen',       group: 'learn' },
  { to: '/flashcards',icon: Brain,           label: 'Karteikarten', group: 'learn' },
  { to: '/mindmap',   icon: Map,             label: 'Mind Map',     group: 'learn' },
  { to: '/search',    icon: Search,          label: 'Suche',        group: 'learn' },
  { to: '/exam',      icon: GraduationCap,   label: 'Prüfung',      group: 'learn' },
  { to: '/planner',   icon: CalendarDays,    label: 'Lernplaner',   group: 'learn' },
  { to: '/audio',     icon: Mic,             label: 'Audio',        group: 'learn' },
  { to: '/pdf',       icon: FileText,        label: 'PDF',          group: 'learn' },
]

const groups = [
  { key: 'main',  label: null       },
  { key: 'life',  label: 'Leben'    },
  { key: 'work',  label: 'Arbeit'   },
  { key: 'learn', label: 'Studium'  },
]

export default function Sidebar() {
  return (
    <aside className="group/sb flex-shrink-0 flex flex-col"
      style={{
        width: 'var(--sidebar-collapsed)',
        minHeight: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border-subtle)',
        transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
      onMouseEnter={e => (e.currentTarget.style.width = 'var(--sidebar-width)')}
      onMouseLeave={e => (e.currentTarget.style.width = 'var(--sidebar-collapsed)')}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-[17px] flex-shrink-0"
           style={{ height: 52, borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="w-[22px] h-[22px] rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
             style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(10,132,255,0.35)' }}>
          L
        </div>
        <span className="text-[13px] font-semibold whitespace-nowrap opacity-0 group-hover/sb:opacity-100 transition-opacity duration-100 delay-[60ms]"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          PersonalOS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden">
        {groups.map(({ key, label }) => {
          const items = nav.filter(n => n.group === key)
          return (
            <div key={key} className={key !== 'main' ? 'mt-1' : ''}>
              {label && (
                <div className="px-2.5 pb-1 pt-3 opacity-0 group-hover/sb:opacity-100 transition-opacity duration-100 delay-[60ms]">
                  <span className="text-[10px] font-semibold tracking-[0.1em] uppercase"
                        style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                </div>
              )}
              {items.map(({ to, icon: Icon, label: itemLabel }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] transition-all duration-100 my-[1px]
                    ${isActive
                      ? 'bg-[--accent-soft]'
                      : 'hover:bg-[rgba(255,255,255,0.05)]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} className="flex-shrink-0"
                            style={{ color: isActive ? 'var(--accent-fg)' : 'var(--text-muted)' }} />
                      <span className="text-[13px] whitespace-nowrap opacity-0 group-hover/sb:opacity-100 transition-opacity duration-100 delay-[60ms]"
                            style={{ color: isActive ? 'var(--accent-fg)' : 'var(--text-secondary)',
                                     fontWeight: isActive ? 500 : 400 }}>
                        {itemLabel}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 px-2 py-3 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 overflow-hidden">
          <QuickAdd />
        </div>
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center text-[10px]"
               style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            L
          </div>
          <span className="text-xs whitespace-nowrap opacity-0 group-hover/sb:opacity-100 transition-opacity duration-100 delay-[60ms]"
                style={{ color: 'var(--text-muted)' }}>
            Lars
          </span>
          <button
            onClick={() => { clearApiKey(); window.location.reload() }}
            className="ml-auto opacity-0 group-hover/sb:opacity-100 transition-opacity duration-100 delay-[60ms] p-1 rounded-lg hover:opacity-70"
            title="Abmelden"
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>
    </aside>
  )
}
