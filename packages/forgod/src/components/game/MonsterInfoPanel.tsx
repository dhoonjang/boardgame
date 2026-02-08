import type { Monster } from '@forgod/core'
import { MONSTERS } from '@forgod/core'
import HealthBar from '../ui/HealthBar'

interface MonsterInfoPanelProps {
  monsters: Monster[]
}

export default function MonsterInfoPanel({ monsters }: MonsterInfoPanelProps) {
  return (
    <div className="bg-parchment-texture border-wood-frame rounded-lg p-2 space-y-1.5">
      <h3 className="font-serif font-bold text-wood-dark text-sm">몬스터</h3>
      {monsters.map(monster => {
        const def = MONSTERS.find(m => m.id === monster.id)
        return (
          <div
            key={monster.id}
            className={`px-2 py-1.5 rounded bg-parchment-dark/20 ${monster.isDead ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-serif font-semibold text-ink text-xs">
                {def?.nameKo || monster.name}
              </span>
              {monster.isDead && (
                <span className="text-[9px] text-red-600 font-medium">사망</span>
              )}
            </div>
            {!monster.isDead && (
              <HealthBar current={monster.health} max={monster.maxHealth} size="sm" />
            )}
            {def && (
              <p className="text-[9px] text-ink-faded mt-0.5">{def.description}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
