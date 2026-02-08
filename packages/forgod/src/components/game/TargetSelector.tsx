import { useGameStore } from '../../store/gameStore'
import RetroButton from '../ui/RetroButton'

export default function TargetSelector() {
  const { interactionMode, clearInteraction } = useGameStore()

  if (interactionMode === 'none') return null

  const messages: Record<string, string> = {
    move: '이동할 타일을 보드에서 클릭하세요',
    attack: '공격할 대상 (플레이어 또는 몬스터)을 클릭하세요',
    skill_target: '스킬 대상을 클릭하세요',
    skill_position: '스킬 위치를 보드에서 클릭하세요',
    escape_tile: '탈출할 위치를 클릭하세요',
  }

  const modeColors: Record<string, string> = {
    move: 'border-gold/50 bg-gold/10',
    attack: 'border-warrior/50 bg-warrior/10',
    skill_target: 'border-corrupt/50 bg-corrupt/10',
    skill_position: 'border-mage/50 bg-mage/10',
    escape_tile: 'border-rogue/50 bg-rogue/10',
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${modeColors[interactionMode] || ''}`}>
      <span className="text-xs text-ink flex-1">
        {messages[interactionMode] || '대상을 선택하세요'}
      </span>
      <RetroButton variant="ghost" size="sm" onClick={clearInteraction}>
        취소
      </RetroButton>
    </div>
  )
}
