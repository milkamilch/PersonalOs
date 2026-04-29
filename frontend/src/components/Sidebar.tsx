import { NavLink } from 'react-router-dom'
import {
  BookOpen, Brain, Map, Search, LayoutDashboard,
  FolderKanban, CheckSquare, GitBranch, Server, Bot,
  GraduationCap, CalendarDays, Mic, FileText
} from 'lucide-react'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projekte' },
  { to: '/study', icon: BookOpen, label: 'Lernen' },
  { to: '/flashcards', icon: Brain, label: 'Karteikarten' },
  { to: '/mindmap', icon: Map, label: 'Mind Map' },
  { to: '/search', icon: Search, label: 'Suche' },
  { to: '/exam', icon: GraduationCap, label: 'Prüfung' },
  { to: '/planner', icon: CalendarDays, label: 'Lernplaner' },
  { to: '/audio', icon: Mic, label: 'Audio' },
  { to: '/pdf', icon: FileText, label: 'PDF Viewer' },
  { to: '/todos', icon: CheckSquare, label: 'Todos' },
  { to: '/github', icon: GitBranch, label: 'GitHub' },
  { to: '/server', icon: Server, label: 'Server' },
  { to: '/jarvis', icon: Bot, label: 'JArvis' },
]

export default function Sidebar() {
  return (
    <aside
      className="group/sb flex-shrink-0 flex flex-col min-h-screen overflow-hidden"
      style={{
        width: 60,
        transition: 'width 280ms cubic-bezier(0.4,0,0.2,1)',
        background: '#0d1117',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={e => (e.currentTarget.style.width = '220px')}
      onMouseLeave={e => (e.currentTarget.style.width = '60px')}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3.5 py-4 flex-shrink-0"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: 56 }}>
        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-sm text-white"
             style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          LB
        </div>
        <span className="font-semibold text-sm whitespace-nowrap overflow-hidden transition-opacity duration-200"
              style={{ opacity: 0, transition: 'opacity 180ms ease 80ms' }}
              ref={el => {
                if (!el) return
                const aside = el.closest('aside')!
                const show = () => { el.style.opacity = '1' }
                const hide = () => { el.style.opacity = '0' }
                aside.addEventListener('mouseenter', show)
                aside.addEventListener('mouseleave', hide)
              }}>
          LectureBase
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-violet-400'
                  : 'text-gray-500 hover:text-gray-200'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
            })}
          >
            <Icon size={18} className="flex-shrink-0" style={{ minWidth: 18 }} />
            <FadeLabel label={label} />
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function FadeLabel({ label }: { label: string }) {
  return (
    <span
      className="text-sm whitespace-nowrap overflow-hidden"
      style={{ opacity: 0, transition: 'opacity 180ms ease 80ms', minWidth: 0 }}
      ref={el => {
        if (!el) return
        const aside = el.closest('aside')!
        const show = () => { el.style.opacity = '1' }
        const hide = () => { el.style.opacity = '0' }
        aside.addEventListener('mouseenter', show)
        aside.addEventListener('mouseleave', hide)
      }}
    >
      {label}
    </span>
  )
}
