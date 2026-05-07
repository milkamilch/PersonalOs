import type { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export default function Card({ children, className = '', style, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 ${onClick ? 'cursor-pointer transition-colors' : ''} ${className}`}
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', ...style }}
    >
      {children}
    </div>
  )
}
