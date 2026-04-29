import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-gray-700 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
