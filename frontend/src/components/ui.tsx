/**
 * Shared UI primitives — rebuilt against the real design tokens in `index.css`.
 *
 * The previous version of this file referenced legacy tokens (`--bg-surface`,
 * `--text-primary`, `--text-muted`, `--bg-elevated`, `--*-fg`, `--*-border`,
 * `--*-soft`, etc.) that **no longer exist** in the active theme. As a result
 * every component here rendered with default browser styling.
 *
 * This rewrite:
 *   • only uses tokens that exist in `index.css`  (--fg, --fg-{2..5},
 *     --surface, --surface-2, --surface-sunk, --line, --line-strong,
 *     --accent, --accent-soft, --accent-fg, --green, --amber, --rose,
 *     --green-soft, --amber-soft, --rose-soft, --shadow-*, --r-*)
 *   • leans on the existing component classes (`btn`, `pill`, `card`,
 *     `card-h`, `card-b`, `field`, `composer`, `empty`)  so there is one
 *     source of truth for component styling
 *   • is now actually safe to import in pages (drop-in for the inline
 *     `Card` / `PageHead` helpers currently duplicated across pages)
 */

import type {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  CSSProperties,
} from 'react'
import { Loader2 } from 'lucide-react'

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ── Button ────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?:    ButtonSize
  loading?: boolean
  icon?:    ReactNode
  block?:   boolean
}

const SIZE_STYLE: Record<ButtonSize, CSSProperties> = {
  sm: { height: 28, padding: '0 10px', fontSize: 12, borderRadius: 8 },
  md: { /* default from .btn */ },
  lg: { height: 38, padding: '0 18px', fontSize: 14 },
}

export function Button({
  variant = 'secondary',
  size    = 'md',
  loading = false,
  icon,
  block,
  className,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === 'primary' ? 'btn primary' :
    variant === 'ghost'   ? 'btn ghost'   :
    variant === 'danger'  ? 'btn danger'  :
    variant === 'success' ? 'btn success' :
                            'btn'
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(variantClass, className)}
      style={{
        ...SIZE_STYLE[size],
        ...(block ? { width: '100%', justifyContent: 'center' } : null),
        ...(disabled || loading ? { opacity: 0.45, cursor: 'not-allowed' } : null),
        ...style,
      }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ── IconButton ────────────────────────────────────────────────────────────
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string  // required for a11y
  children: ReactNode
}
export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button {...rest} aria-label={label} title={label} className={cn('iconbtn', className)}>
      {children}
    </button>
  )
}

// ── Pill / Badge ──────────────────────────────────────────────────────────
export type PillVariant = 'neutral' | 'accent' | 'success' | 'warn' | 'danger'

interface PillProps {
  variant?: PillVariant
  dot?: boolean
  children: ReactNode
  className?: string
}
export function Pill({ variant = 'neutral', dot, children, className }: PillProps) {
  const v = variant === 'neutral' ? '' : variant
  return (
    <span className={cn('pill', v, className)}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}
/** Alias kept for code that already imports `Badge`. */
export const Badge = Pill

// ── Card ──────────────────────────────────────────────────────────────────
interface CardProps {
  title?:    ReactNode
  meta?:     ReactNode
  color?:    string       // override accent dot
  href?:     string       // not used here — pages wrap with <Link>; kept for API parity
  padding?:  'none' | 'tight' | 'default'
  onClick?:  () => void
  className?: string
  style?:    CSSProperties
  children:  ReactNode
}
export function Card({
  title,
  meta,
  color,
  padding = 'default',
  onClick,
  className,
  style,
  children,
}: CardProps) {
  return (
    <div
      className={cn('card', onClick && 'link', className)}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {title && (
        <div className="card-h">
          <span className="accent-dot" style={color ? { background: color } : undefined} />
          <span className="title">{title}</span>
          <div className="spacer" />
          {meta && <span className="meta">{meta}</span>}
        </div>
      )}
      {padding === 'none'
        ? children
        : <div className={cn('card-b', padding === 'tight' && 'tight')}>{children}</div>}
    </div>
  )
}

// ── Inputs ────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { icon?: ReactNode }
export function Input({ icon, className, style, ...props }: InputProps) {
  return (
    <label className={cn('field', className)} style={style}>
      {icon && <span style={{ color: 'var(--fg-4)', display: 'inline-flex' }}>{icon}</span>}
      <input {...props} />
    </label>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function Textarea({ className, style, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={className}
      style={{
        width: '100%',
        background: 'var(--surface-sunk)',
        border: '1px solid transparent',
        borderRadius: 'var(--r-sm)',
        padding: '10px 12px',
        fontSize: 13,
        color: 'var(--fg)',
        outline: 'none',
        resize: 'vertical',
        lineHeight: 1.5,
        transition: 'border-color 120ms, background 120ms',
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--line-strong)' }}
      onBlur={e  => { e.currentTarget.style.background = 'var(--surface-sunk)'; e.currentTarget.style.borderColor = 'transparent' }}
    />
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}
export function Select({ className, children, style, ...props }: SelectProps) {
  return (
    <label className={cn('field', className)} style={style}>
      <select {...props} style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: 24 }}>
        {children}
      </select>
      <svg
        width="10" height="10" viewBox="0 0 10 10" fill="none"
        style={{ marginLeft: -16, color: 'var(--fg-4)', pointerEvents: 'none' }}
        aria-hidden
      >
        <path d="M2.5 4l2.5 2.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--accent)' }} aria-label="lädt" />
}

// ── EmptyState ────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '36px 16px', textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'var(--surface-sunk)', border: '1px solid var(--line)',
          display: 'grid', placeItems: 'center', color: 'var(--fg-3)',
          marginBottom: 4,
        }}>{icon}</div>
      )}
      <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg-2)', margin: 0 }}>{title}</p>
      {description && <p style={{ fontSize: 12.5, color: 'var(--fg-4)', maxWidth: 320, margin: 0 }}>{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────
interface SectionHeaderProps {
  icon?: ReactNode
  title: string
  count?: number
  right?: ReactNode
}
export function SectionHeader({ icon, title, count, right }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>{icon}</span>}
        <h2 style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--fg-3)', margin: 0,
        }}>{title}</h2>
        {count !== undefined && <Pill>{count}</Pill>}
      </div>
      {right}
    </div>
  )
}

// ── Kbd ───────────────────────────────────────────────────────────────────
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd style={{
      fontFamily: 'inherit', fontSize: 10.5, padding: '1px 5px', borderRadius: 4,
      background: 'var(--surface)', border: '1px solid var(--line)',
      color: 'var(--fg-3)', lineHeight: 1.4,
    }}>{children}</kbd>
  )
}
