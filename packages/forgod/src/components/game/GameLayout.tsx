import type { ReactNode } from 'react'

interface GameLayoutProps {
  banner: ReactNode
  leftPanel: ReactNode
  board: ReactNode
  rightPanel: ReactNode
  bottomLeft: ReactNode
  bottomRight: ReactNode
}

export default function GameLayout({
  banner,
  leftPanel,
  board,
  rightPanel,
  bottomLeft,
  bottomRight,
}: GameLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-ink/95 p-2 gap-2">
      {/* Top banner */}
      <div className="shrink-0">
        {banner}
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-2 min-h-0">
        {/* Left sidebar */}
        <div className="w-52 shrink-0 overflow-y-auto">
          {leftPanel}
        </div>

        {/* Center board */}
        <div className="flex-1 min-w-0">
          {board}
        </div>

        {/* Right sidebar */}
        <div className="w-64 shrink-0 overflow-y-auto space-y-2">
          {rightPanel}
        </div>
      </div>

      {/* Bottom panel */}
      <div className="shrink-0 flex gap-2">
        <div className="flex-1">
          {bottomLeft}
        </div>
        <div className="w-72 shrink-0">
          {bottomRight}
        </div>
      </div>
    </div>
  )
}
