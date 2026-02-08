import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface RetroCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glow?: 'holy' | 'corrupt' | 'gold' | null
  selected?: boolean
}

const glowStyles = {
  holy: 'ring-2 ring-holy/60 shadow-[0_0_12px_rgba(74,144,217,0.3)]',
  corrupt: 'ring-2 ring-corrupt/60 shadow-[0_0_12px_rgba(142,68,173,0.3)]',
  gold: 'ring-2 ring-gold/60 shadow-[0_0_12px_rgba(201,168,76,0.3)]',
}

export default function RetroCard({
  children,
  glow = null,
  selected = false,
  className,
  ...props
}: RetroCardProps) {
  return (
    <div
      className={clsx(
        'bg-parchment rounded-lg border-2 border-wood shadow-card p-2 transition-all duration-200',
        glow && glowStyles[glow],
        selected && 'ring-2 ring-gold border-gold',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
