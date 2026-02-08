import type { Revelation } from '@forgod/core'
import RetroPanel from '../ui/RetroPanel'
import Badge from '../ui/Badge'
import RetroButton from '../ui/RetroButton'

interface RevelationDetailProps {
  revelation: Revelation
  canComplete: boolean
  onComplete?: () => void
  onClose: () => void
}

export default function RevelationDetail({ revelation, canComplete, onComplete, onClose }: RevelationDetailProps) {
  return (
    <div className="fixed inset-0 z-40 bg-ink/60 flex items-center justify-center">
      <RetroPanel className="max-w-sm w-full mx-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={revelation.source === 'angel' ? 'holy' : 'corrupt'} size="md">
            {revelation.source === 'angel' ? '천사 계시' : '마왕 계시'}
          </Badge>
          {revelation.isGameEnd && <Badge variant="gold" size="md">최종 계시</Badge>}
        </div>

        <h3 className="font-serif font-bold text-ink text-lg mb-2">{revelation.name}</h3>
        <p className="text-ink-light text-sm mb-4">{revelation.task}</p>

        <div className="bg-parchment-dark/30 rounded p-2 mb-4">
          <h4 className="text-[10px] text-ink-faded font-medium mb-1">보상</h4>
          <div className="flex gap-2 text-xs">
            {revelation.reward.faithScore && (
              <span className="text-holy">신앙 +{revelation.reward.faithScore}</span>
            )}
            {revelation.reward.devilScore && (
              <span className="text-corrupt">마왕 +{revelation.reward.devilScore}</span>
            )}
            {revelation.reward.extraRevelations && (
              <span className="text-gold-dark">계시 +{revelation.reward.extraRevelations}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <RetroButton variant="secondary" size="sm" onClick={onClose}>닫기</RetroButton>
          {canComplete && onComplete && (
            <RetroButton variant="gold" size="sm" onClick={onComplete}>완료</RetroButton>
          )}
        </div>
      </RetroPanel>
    </div>
  )
}
