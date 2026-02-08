import clsx from 'clsx'
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'holy' | 'corrupt' | 'warrior' | 'rogue' | 'mage' | 'gold' | 'danger'
  size?: 'sm' | 'md'
  className?: string
}

const variantStyles = {
  default: 'bg-parchment-dark text-ink',
  holy: 'bg-holy/20 text-holy-700 border-holy/30',
  corrupt: 'bg-corrupt/20 text-corrupt-700 border-corrupt/30',
  warrior: 'bg-warrior/20 text-warrior-600 border-warrior/30',
  rogue: 'bg-rogue/20 text-rogue-600 border-rogue/30',
  mage: 'bg-mage/20 text-mage-600 border-mage/30',
  gold: 'bg-gold/20 text-gold-dark border-gold/30',
  danger: 'bg-red-100 text-red-700 border-red-300',
}

export default function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full border font-medium',
      variantStyles[variant],
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
      className
    )}>
      {children}
    </span>
  )
}
