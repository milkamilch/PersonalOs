/**
 * Thin compatibility wrapper around the new shared `Card` in `./ui`.
 *
 * Previously this file referenced `--bg-surface` / `--border-subtle` which
 * no longer exist in the active theme. New imports should use `Card` from
 * `./ui` directly; this default export is kept so existing imports keep
 * working without a churn-y find/replace.
 */
import type { ReactNode, CSSProperties } from 'react'
import { Card as UICard } from './ui'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export default function Card({ children, className, style, onClick }: Props) {
  return (
    <UICard padding="default" className={className} style={style} onClick={onClick}>
      {children}
    </UICard>
  )
}
