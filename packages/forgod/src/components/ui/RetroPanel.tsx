import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface RetroPanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  children: ReactNode
  variant?: 'default' | 'compact' | 'dark'
}

export default function RetroPanel({
  title,
  children,
  variant = 'default',
  className,
  ...props
}: RetroPanelProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border-wood-frame',
        variant === 'dark'
          ? 'bg-ink/90 text-parchment'
          : 'bg-parchment-texture',
        variant === 'compact' ? 'p-2' : 'p-3',
        className
      )}
      {...props}
    >
      {title && (
        <h3 className={clsx(
          'font-serif font-bold text-ink-shadow mb-2',
          variant === 'dark' ? 'text-gold' : 'text-wood-dark',
          variant === 'compact' ? 'text-sm' : 'text-base',
        )}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
