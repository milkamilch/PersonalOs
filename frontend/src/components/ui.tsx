import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ── Button ────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?:    ButtonSize
  loading?: boolean
  icon?:    ReactNode
  children?: ReactNode
}

const btnBase = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none'

const btnVariants: Record<ButtonVariant, string> = {
  primary:   'bg-[--accent] text-white shadow-sm hover:brightness-110 active:brightness-95',
  secondary: 'bg-[--accent-soft] text-[--accent-fg] hover:bg-[rgba(10,132,255,0.2)] border border-[--accent-border]',
  ghost:     'bg-transparent text-[--text-secondary] hover:bg-[rgba(255,255,255,0.07)] hover:text-[--text-primary] border border-[--border-default]',
  danger:    'bg-[--red-soft] text-[--red-fg] border border-[--red-border] hover:bg-[rgba(255,69,58,0.2)]',
  success:   'bg-[--green-soft] text-[--green-fg] border border-[--green-border] hover:bg-[rgba(48,209,88,0.2)]',
}

const btnSizes: Record<ButtonSize, string> = {
  xs: 'h-7  px-2.5 text-xs  gap-1.5',
  sm: 'h-8  px-3   text-xs  gap-1.5',
  md: 'h-9  px-4   text-sm  gap-2',
  lg: 'h-10 px-5   text-sm  gap-2',
}

export function Button({ variant = 'secondary', size = 'md', loading = false, icon, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button {...props} disabled={disabled || loading}
      className={cn(btnBase, btnVariants[variant], btnSizes[size], className)}>
      {loading ? <Loader2 size={13} className="animate-spin flex-shrink-0" /> : icon}
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────
export type BadgeVariant = 'accent' | 'green' | 'red' | 'yellow' | 'blue' | 'neutral' | 'orange'

const badgeVariants: Record<BadgeVariant, string> = {
  accent:  'bg-[--accent-soft]         text-[--accent-fg]   border-[--accent-border]',
  green:   'bg-[--green-soft]          text-[--green-fg]    border-[--green-border]',
  red:     'bg-[--red-soft]            text-[--red-fg]      border-[--red-border]',
  yellow:  'bg-[--yellow-soft]         text-[--yellow-fg]   border-[--yellow-border]',
  blue:    'bg-[--blue-soft]           text-[--blue-fg]     border-[--blue-border]',
  orange:  'bg-[--orange-soft]         text-[--orange-fg]   border-[rgba(255,159,10,0.28)]',
  neutral: 'bg-[rgba(255,255,255,0.07)] text-[--text-secondary] border-[--border-default]',
}

interface BadgeProps { variant?: BadgeVariant; children: ReactNode; className?: string }
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border', badgeVariants[variant], className)}>
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────
interface CardProps { children: ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void; elevated?: boolean; padding?: 'none' | 'sm' | 'md' | 'lg' }
export function Card({ children, className, style, onClick, elevated, padding = 'md' }: CardProps) {
  const pads = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' }
  return (
    <div onClick={onClick} style={style}
      className={cn(elevated ? 'card-elevated' : 'card', pads[padding], onClick && 'cursor-pointer transition-transform hover:-translate-y-px', className)}>
      {children}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { icon?: ReactNode }
export function Input({ icon, className, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      <input {...props}
        className={cn(
          'w-full rounded-xl border text-sm outline-none transition-all',
          'bg-[--bg-input] border-[--border-default]',
          'text-[--text-primary] placeholder:text-[--text-placeholder]',
          'px-3 py-2',
          'focus:border-[--accent] focus:ring-0',
          icon ? 'pl-9' : '',
          className,
        )}
        style={{ ...props.style }}
      />
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea {...props}
      className={cn(
        'w-full rounded-xl border text-sm outline-none transition-all resize-none',
        'bg-[--bg-input] border-[--border-default]',
        'text-[--text-primary] placeholder:text-[--text-placeholder]',
        'px-3 py-2',
        'focus:border-[--accent]',
        className,
      )}
    />
  )
}

// ── Select ────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select {...props} style={{ colorScheme: 'dark' }}
      className={cn(
        'w-full rounded-xl border text-sm outline-none transition-all appearance-none',
        'bg-[--bg-input] border-[--border-default]',
        'text-[--text-primary]',
        'px-3 py-2',
        'focus:border-[--accent]',
        className,
      )}>
      {children}
    </select>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--accent-fg)' }} />
}

// ── EmptyState ────────────────────────────────────────────────────────────
interface EmptyStateProps { icon: ReactNode; title: string; description?: string; action?: ReactNode }
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
           style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {description && <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────
interface SectionHeaderProps { icon?: ReactNode; title: string; count?: number; right?: ReactNode }
export function SectionHeader({ icon, title, count, right }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: 'var(--accent-fg)' }}>{icon}</span>}
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</h2>
        {count !== undefined && <Badge variant="neutral">{count}</Badge>}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}
