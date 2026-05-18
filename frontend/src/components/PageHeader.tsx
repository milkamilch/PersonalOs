/**
 * Shared page header — drop-in replacement for the inline `PageHead`
 * function currently duplicated across **17 page files**
 * (HabitsPage, GoalsPage, FinancePage, FitnessPage, JournalPage,
 *  MediaPage, ReadingPage, ContactsPage, CalendarPage, NotesPage,
 *  TodosPage, ProjectsPage, GitHubPage, ServerPage, FocusPage,
 *  TimePage, WeeklyPlannerPage).
 *
 * Same prop signature → migration is a literal find-and-replace:
 *
 *   - // delete the local function PageHead(...) at the top of each page
 *   + import PageHeader from '../components/PageHeader'
 *   - <PageHead .../>
 *   + <PageHeader .../>
 *
 * Uses the existing `.page-head`, `.eyebrow`, `.sub` classes from
 * `index.css` — no new tokens introduced.
 */
import type { ReactNode } from 'react'

interface Props {
  eyebrow?: string
  title:    string
  sub?:     string
  action?:  ReactNode
}

export default function PageHeader({ eyebrow, title, sub, action }: Props) {
  return (
    <div
      className="page-head"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {action && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {action}
        </div>
      )}
    </div>
  )
}
