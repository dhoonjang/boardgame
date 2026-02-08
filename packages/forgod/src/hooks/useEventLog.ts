import type { GameEvent } from '@forgod/core'

export function eventToKorean(event: GameEvent): string {
  switch (event.type) {
    case 'PLAYER_MOVED':
      return `(${event.from.q},${event.from.r})에서 (${event.to.q},${event.to.r})으로 이동`
    case 'PLAYER_ATTACKED':
      return `${event.damage} 데미지를 입혔습니다!`
    case 'PLAYER_DIED':
      return '사망했습니다'
    case 'PLAYER_RESPAWNED':
      return '부활했습니다!'
    case 'MONSTER_DIED':
      return '몬스터를 처치했습니다!'
    case 'REVELATION_COMPLETED':
      return '계시를 완료했습니다!'
    case 'STAT_UPGRADED': {
      const statNames: Record<string, string> = {
        strength: '힘',
        dexterity: '민첩',
        intelligence: '지능',
      }
      return `${statNames[event.stat] || event.stat}이(가) ${event.newValue}로 업그레이드`
    }
    case 'GAME_OVER':
      return '게임이 종료되었습니다!'
    default:
      return '알 수 없는 이벤트'
  }
}
