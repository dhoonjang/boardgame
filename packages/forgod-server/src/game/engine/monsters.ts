import { DEATH_RESPAWN_TURNS, MONSTERS } from '../constants';
import { getDistance } from '../hex';
import type { GameEvent, GameState, HexCoord, Monster, Player } from '../types';

/**
 * 몬스터 주사위 굴리기 (6개)
 */
export function rollMonsterDice(): number[] {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1)
}

/**
 * 몬스터 단계 처리
 * 1. 주사위 굴림 → 정렬
 * 2. 각 몬스터: 효과 먼저, 공격 항상 실행 (별개)
 * 3. 발록 부활 체크
 * 4. 몬스터 라운드 버프 리셋
 */
export function processMonsterPhase(state: GameState): { newState: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  const monsterDice = rollMonsterDice()
  const sortedDice = [...monsterDice].sort((a, b) => a - b)

  let newState = { ...state, monsterDice }

  for (const monster of state.monsters) {
    if (monster.isDead) continue

    const monsterDef = MONSTERS.find(m => m.id === monster.id)
    if (!monsterDef) continue

    // 주사위 합 계산
    const diceSum = monster.diceIndices.reduce((sum, idx) => sum + sortedDice[idx], 0)

    // 인접한 생존 용사 찾기
    const adjacentPlayers = newState.players.filter(p =>
      !p.isDead && getDistance(monster.position, p.position) === 1
    )

    // === 효과 먼저 처리 ===
    const effectResult = processMonsterEffect(monster, monsterDef.id, diceSum, adjacentPlayers, newState)
    newState = effectResult.newState
    events.push(...effectResult.events)

    // === 공격 처리 (효과와 별개로 항상 실행) ===
    // 공격 대상 결정
    const targetTileIndex = diceSum % monsterDef.adjacentTiles.length
    const targetTile = monsterDef.adjacentTiles[targetTileIndex]

    // 업데이트된 플레이어 목록에서 인접 용사 재확인
    const currentAdjacentPlayers = newState.players.filter(p =>
      !p.isDead && getDistance(monster.position, p.position) === 1
    )
    const targetPlayer = currentAdjacentPlayers.find(p =>
      p.position.q === targetTile.q && p.position.r === targetTile.r
    )

    if (targetPlayer) {
      // 트롤: 타락 용사에게는 홀수일 때만 공격
      if (monsterDef.id === 'troll' && targetPlayer.state === 'corrupt' && diceSum % 2 === 0) {
        continue
      }
      // 은신 용사: 공격 스킵
      if (targetPlayer.isStealthed) {
        continue
      }
      // 마검 소유자: 공격 스킵 (양방향 불가)
      if (targetPlayer.hasDemonSword) {
        continue
      }

      const damage = diceSum
      const attackResult = applyMonsterDamage(newState.players, targetPlayer.id, damage, monster.id, newState)
      newState = { ...newState, players: attackResult.players }
      events.push(...attackResult.events)

      // 그린딜로: 공격 대상 속박
      if (monsterDef.id === 'grindylow' && diceSum >= 7) {
        newState = {
          ...newState,
          players: newState.players.map(p =>
            p.id === targetPlayer.id ? { ...p, isBound: true } : p
          ),
        }
      }
    }
  }

  // 발록 부활 체크
  newState = checkBalrogRespawn(newState)

  // 몬스터 라운드 버프 리셋 (golemBasicAttackImmune, meteorImmune만 리셋 - fireTileDisabled는 발록 생존에 의존)
  const balrog = newState.monsters.find(m => m.id === 'balrog')
  newState = {
    ...newState,
    monsterRoundBuffs: {
      golemBasicAttackImmune: false,
      meteorImmune: false,
      fireTileDisabled: balrog?.isDead ? true : false,
    },
  }

  return { newState, events }
}

interface MonsterEffectResult {
  newState: GameState
  events: GameEvent[]
}

/**
 * 몬스터별 고유 효과 처리 (공격과 별개)
 */
function processMonsterEffect(
  monster: Monster,
  monsterId: string,
  diceSum: number,
  adjacentPlayers: Player[],
  state: GameState
): MonsterEffectResult {
  const events: GameEvent[] = []
  let newState = state

  switch (monsterId) {
    case 'harpy': {
      // 하피: 합 ≥ 7이면 인접 용사 한 칸 밀어냄 (몬스터에서 멀어지는 방향)
      if (diceSum >= 7) {
        for (const player of adjacentPlayers) {
          const pushDir: HexCoord = {
            q: player.position.q - monster.position.q,
            r: player.position.r - monster.position.r,
          }
          const newPosition: HexCoord = {
            q: player.position.q + pushDir.q,
            r: player.position.r + pushDir.r,
          }

          newState = {
            ...newState,
            players: newState.players.map(p =>
              p.id === player.id ? { ...p, position: newPosition } : p
            ),
          }
          events.push({
            type: 'PLAYER_MOVED',
            playerId: player.id,
            from: player.position,
            to: newPosition,
          })
        }
      }
      break
    }

    case 'lich': {
      // 리치: 합 ≥ 15이면 몬스터들 메테오 면역 (다음 라운드까지)
      if (diceSum >= 15) {
        newState = {
          ...newState,
          monsterRoundBuffs: { ...newState.monsterRoundBuffs, meteorImmune: true },
        }
      }
      break
    }

    case 'hydra': {
      // 히드라: 합 ≥ 15이면 잃은 체력의 2배 회복 (maxHealth 초과 가능)
      if (diceSum >= 15) {
        const lostHealth = monster.maxHealth - monster.health
        const healAmount = lostHealth * 2
        if (healAmount > 0) {
          newState = {
            ...newState,
            monsters: newState.monsters.map(m =>
              m.id === monster.id ? { ...m, health: m.health + healAmount } : m
            ),
          }
        }
      }
      break
    }

    case 'golem': {
      // 골렘: 합 = 12이면 기본 공격 피해 무시 (다음 라운드까지)
      if (diceSum === 12) {
        newState = {
          ...newState,
          monsterRoundBuffs: { ...newState.monsterRoundBuffs, golemBasicAttackImmune: true },
        }
      }
      break
    }

    // 그린딜로, 트롤, 발록은 공격 시에 처리 (효과와 공격이 결합)
    default:
      break
  }

  return { newState, events }
}

/**
 * 몬스터 피해 적용 (무적 태세, 은신 등 고려)
 */
function applyMonsterDamage(
  players: Player[],
  targetId: string,
  damage: number,
  attackerId: string,
  _state: GameState
): { players: Player[]; events: GameEvent[] } {
  const events: GameEvent[] = []
  const target = players.find(p => p.id === targetId)

  if (!target) {
    return { players, events }
  }

  // 은신이면 피해 스킵
  if (target.isStealthed) {
    return { players, events }
  }

  // 무적 태세로 피해 감소
  let actualDamage = damage
  if (target.ironStanceActive) {
    const reduction = target.stats.strength[0] + target.stats.strength[1]
    actualDamage = Math.max(0, actualDamage - reduction)
  }

  const newHealth = Math.max(0, target.health - actualDamage)
  const isDead = newHealth <= 0

  const newPlayers = players.map(p =>
    p.id === targetId
      ? {
          ...p,
          health: newHealth,
          isDead,
          deathTurnsRemaining: isDead ? DEATH_RESPAWN_TURNS : p.deathTurnsRemaining,
        }
      : p
  )

  events.push({
    type: 'PLAYER_ATTACKED',
    attackerId,
    targetId,
    damage: actualDamage,
  })

  if (isDead) {
    events.push({
      type: 'PLAYER_DIED',
      playerId: targetId,
    })
  }

  return { players: newPlayers, events }
}

/**
 * 발록 부활 체크 (희생 라운드 후)
 */
export function checkBalrogRespawn(state: GameState): GameState {
  const balrog = state.monsters.find(m => m.id === 'balrog')
  if (!balrog || !balrog.isDead) {
    return state
  }

  const balrogDef = MONSTERS.find(m => m.id === 'balrog')
  if (!balrogDef) {
    return state
  }

  // 발록 부활 + 화염 타일 다시 활성
  return {
    ...state,
    monsters: state.monsters.map(m =>
      m.id === 'balrog'
        ? { ...m, isDead: false, health: balrogDef.maxHealth }
        : m
    ),
    monsterRoundBuffs: { ...state.monsterRoundBuffs, fireTileDisabled: false },
  }
}
