import clsx from 'clsx'
import type { Player, Skill, ValidAction, HexCoord } from '@forgod/core'
import { SKILLS_BY_CLASS, getNeighbors } from '@forgod/core'
import { useGameStore } from '../../store/gameStore'
import Tooltip from '../ui/Tooltip'

interface SkillPanelProps {
  player: Player
  validActions: ValidAction[]
}

export default function SkillPanel({ player, validActions }: SkillPanelProps) {
  const { executeAction, setInteraction, selectedSkillId, clearInteraction } = useGameStore()
  const skills: Skill[] = SKILLS_BY_CLASS[player.heroClass] || []
  const intValue = player.stats.intelligence[0] + player.stats.intelligence[1]
  const remaining = intValue - player.usedSkillCost

  const getSkillActions = (skillId: string) =>
    validActions.filter(va => va.action.type === 'USE_SKILL' && (va.action as { skillId: string }).skillId === skillId)

  const handleSkillClick = (skill: Skill) => {
    const actions = getSkillActions(skill.id)
    if (actions.length === 0) return

    // If already selected, deselect
    if (selectedSkillId === skill.id) {
      clearInteraction()
      return
    }

    // 스킬 정의의 targetType으로 타겟팅 모드 결정
    if (skill.targetType === 'entity') {
      // 대상 선택 필요 (플레이어/몬스터 토큰 클릭)
      setInteraction('skill_target', [], skill.id)
    } else if (skill.targetType === 'position') {
      // 위치 선택 필요 (타일 클릭) - 스킬별 유효 타일 계산
      const { gameState } = useGameStore.getState()
      if (!gameState) return
      let tiles: HexCoord[] = []
      if (skill.id === 'mage-meteor') {
        // 메테오: 모든 타일 선택 가능
        tiles = gameState.board.map(t => t.coord)
      } else {
        // warrior-sword-wave, rogue-shuriken: 방향 선택 (인접 타일)
        tiles = getNeighbors(player.position).filter(n =>
          gameState.board.some(t => t.coord.q === n.q && t.coord.r === n.r)
        )
      }
      setInteraction('skill_position', tiles, skill.id)
    } else {
      // 대상 없음 - 즉시 실행
      executeAction(actions[0].action)
    }
  }

  return (
    <div className="bg-parchment-texture border-wood-frame rounded-lg p-2">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="font-serif font-bold text-wood-dark text-sm">스킬</h3>
        <span className="text-xs text-ink-faded font-mono">
          남은: {remaining}/{intValue}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {skills.map(skill => {
          const cd = player.skillCooldowns[skill.id] || 0
          const actions = getSkillActions(skill.id)
          const canUse = actions.length > 0
          const isSelected = selectedSkillId === skill.id
          const isEnhanceable = player.isEnhanced

          return (
            <Tooltip
              key={skill.id}
              content={
                <div className="max-w-48">
                  <div className="font-bold">{skill.name}</div>
                  <div className="text-[10px] mt-0.5">{skill.description}</div>
                  <div className="text-[10px] mt-1 text-gold-light">
                    비용: {skill.cost} | 쿨타임: {skill.cooldown}턴
                  </div>
                </div>
              }
              position="top"
            >
              <button
                onClick={() => handleSkillClick(skill)}
                disabled={!canUse}
                className={clsx(
                  'relative w-full aspect-square rounded border text-center transition-all',
                  'flex flex-col items-center justify-center',
                  canUse
                    ? 'border-wood hover:border-gold cursor-pointer bg-parchment-dark/30 hover:bg-gold/10'
                    : 'border-wood/30 opacity-40 cursor-not-allowed bg-parchment-dark/10',
                  isSelected && 'ring-2 ring-gold bg-gold/20 border-gold',
                  isEnhanceable && canUse && 'shadow-[0_0_8px_rgba(41,128,185,0.3)]',
                )}
              >
                <span className="text-[10px] font-serif font-bold text-ink leading-tight truncate px-0.5">
                  {skill.name}
                </span>
                <span className="text-[8px] text-gold-dark font-mono mt-0.5">{skill.cost}</span>
                {cd > 0 && (
                  <span className="absolute top-0 right-0 bg-red-700 text-white text-[8px] px-1 rounded-bl font-mono">
                    {cd}
                  </span>
                )}
              </button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
