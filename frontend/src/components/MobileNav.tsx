import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, Heart, BookOpen } from 'lucide-react'
import QuickAdd from './QuickAdd'

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/todos',     icon: CheckSquare,     label: 'Todos' },
  null, // center: QuickAdd
  { to: '/habits',    icon: Heart,           label: 'Habits' },
  { to: '/journal',   icon: BookOpen,        label: 'Journal' },
]

export default function MobileNav() {
  return (
    <nav
      className="flex items-center justify-around px-2"
      style={{
        background: 'rgba(20,20,21,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        paddingTop: '8px',
      }}
    >
      {tabs.map((tab) => {
        if (!tab) return (
          <div key="quick" className="flex flex-col items-center -mt-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                 style={{ background: 'var(--accent)', boxShadow: '0 4px 16px rgba(10,132,255,0.4)' }}>
              <QuickAdd />
            </div>
          </div>
        )
        const { to, icon: Icon, label } = tab
        return (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
            style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-muted)' })}
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
