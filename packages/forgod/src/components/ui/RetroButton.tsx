import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variantStyles = {
  primary: 'bg-wood-dark text-parchment-light hover:bg-wood border-wood-dark',
  secondary: 'bg-parchment-dark text-ink hover:bg-parchment border-wood',
  danger: 'bg-red-900/80 text-red-100 hover:bg-red-800/80 border-red-900',
  gold: 'bg-gold-dark text-ink hover:bg-gold border-gold-dark',
  ghost: 'bg-transparent text-ink-light hover:bg-parchment-dark/50 border-transparent',
}

const sizeStyles = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function RetroButton({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}: RetroButtonProps) {
  return (
    <button
      className={clsx(
        'font-serif font-semibold rounded border-2 transition-all duration-150',
        'shadow-wood active:shadow-wood-pressed active:translate-y-px',
        'focus:outline-none focus:ring-2 focus:ring-gold/50',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-50 cursor-not-allowed active:translate-y-0 active:shadow-wood',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
