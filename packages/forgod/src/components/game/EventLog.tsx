import { useRef, useEffect } from 'react'
import type { GameEvent } from '@forgod/core'
import type { UIGameEvent } from '../../store/gameStore'

interface EventLogProps {
  events: UIGameEvent[]
}

function eventToText(event: GameEvent): string {
  switch (event.type) {
    case 'PLAYER_MOVED':
      return `이동: (${event.from.q},${event.from.r}) → (${event.to.q},${event.to.r})`
    case 'PLAYER_ATTACKED':
      return `공격! ${event.damage} 데미지`
    case 'PLAYER_DIED':
      return `사망!`
    case 'PLAYER_RESPAWNED':
      return `부활!`
    case 'MONSTER_DIED':
      return `몬스터 처치!`
    case 'REVELATION_COMPLETED':
      return `계시 완료!`
    case 'STAT_UPGRADED':
      return `${event.stat} 업그레이드 → ${event.newValue}`
    case 'MOVE_DICE_ROLLED':
      return `이동 주사위: ${event.dice1}+${event.dice2} +민첩${event.dexBonus} = ${event.total}`
    case 'GAME_OVER':
      return `게임 종료!`
    default:
      return JSON.stringify(event)
  }
}

export default function EventLog({ events }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [events.length])

  return (
    <div className="bg-parchment-texture border-wood-frame rounded-lg p-2 flex flex-col max-h-40">
      <h3 className="font-serif font-bold text-wood-dark text-sm mb-1 shrink-0">이벤트 로그</h3>
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-0.5 text-xs min-h-0">
        {events.length === 0 ? (
          <p className="text-ink-faded italic">아직 이벤트가 없습니다</p>
        ) : (
          events.map(entry => (
            <div key={entry.id} className="text-ink-light py-0.5 border-b border-wood/10">
              {eventToText(entry.event)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
