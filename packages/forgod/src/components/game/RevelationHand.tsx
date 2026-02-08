import type { Revelation } from '@forgod/core'
import RetroCard from '../ui/RetroCard'
import Badge from '../ui/Badge'

interface RevelationHandProps {
  revelations: Revelation[]
  completedRevelations: Revelation[]
  onSelect?: (revelationId: string) => void
  canComplete?: (revelationId: string) => boolean
}

export default function RevelationHand({ revelations, completedRevelations, onSelect, canComplete }: RevelationHandProps) {
  if (revelations.length === 0 && completedRevelations.length === 0) {
    return (
      <div className="text-xs text-ink-faded italic p-2">계시 카드가 없습니다</div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Active revelations */}
      {revelations.length > 0 && (
        <div>
          <h4 className="text-[10px] text-ink-faded font-medium mb-1">보유 중</h4>
          <div className="space-y-1">
            {revelations.map(rev => {
              const completable = canComplete?.(rev.id) ?? false
              return (
                <RetroCard
                  key={rev.id}
                  glow={completable ? (rev.source === 'angel' ? 'holy' : 'corrupt') : null}
                  className={`p-1.5 cursor-pointer hover:border-gold transition-colors ${completable ? '' : 'opacity-70'}`}
                  onClick={() => completable && onSelect?.(rev.id)}
                >
                  <div className="flex items-center gap-1">
                    <Badge variant={rev.source === 'angel' ? 'holy' : 'corrupt'} size="sm">
                      {rev.source === 'angel' ? '천사' : '마왕'}
                    </Badge>
                    <span className="font-serif text-xs font-semibold text-ink truncate">{rev.name}</span>
                    {rev.isGameEnd && <Badge variant="gold" size="sm">최종</Badge>}
                  </div>
                  <p className="text-[10px] text-ink-faded mt-0.5 line-clamp-2">{rev.task}</p>
                </RetroCard>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed revelations */}
      {completedRevelations.length > 0 && (
        <div>
          <h4 className="text-[10px] text-ink-faded font-medium mb-1">완료됨</h4>
          <div className="space-y-1">
            {completedRevelations.map(rev => (
              <div key={rev.id} className="flex items-center gap-1 px-1.5 py-1 bg-parchment-dark/20 rounded opacity-60">
                <Badge variant={rev.source === 'angel' ? 'holy' : 'corrupt'} size="sm">
                  {rev.source === 'angel' ? '천사' : '마왕'}
                </Badge>
                <span className="font-serif text-[10px] text-ink-faded line-through truncate">{rev.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
