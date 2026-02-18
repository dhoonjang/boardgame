import type { PlayerViewPlayer } from '@indian-poker/server/game'

interface Props {
  me: PlayerViewPlayer
}

export default function MyArea({ me }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-poker-accent">{me.name}</span>
        <span className="text-sm text-poker-accent font-semibold">🪙 {me.chips}</span>
      </div>
    </div>
  )
}
