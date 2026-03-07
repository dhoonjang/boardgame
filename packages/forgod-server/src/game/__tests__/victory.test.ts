import { describe, expect, it } from 'vitest'
import { GAME_BOARD } from '../constants'
import { GameEngine } from '../engine/game-engine'
import {
  checkVictoryCondition,
  handleGameOver,
  getPlayerScores,
} from '../engine/victory'
import type { GameState, Revelation } from '../types'

function createTestState(): GameState {
  const engine = new GameEngine()
  return engine.createGame({
    players: [
      { id: 'player-1', name: 'Warrior', heroClass: 'warrior' },
      { id: 'player-2', name: 'Rogue', heroClass: 'rogue' },
      { id: 'player-3', name: 'Mage', heroClass: 'mage' },
    ],
  })
}

// 마왕성 위치 찾기
const castleTile = GAME_BOARD.find(t => t.type === 'castle')!
// 신전 위치 찾기
const templeTile = GAME_BOARD.find(t => t.type === 'temple')!

describe('victory', () => {
  describe('checkVictoryCondition', () => {
    describe('승리 조건 없음', () => {
      it('초기 상태에서는 승리자가 없다', () => {
        const state = createTestState()
        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(false)
        expect(result.winnerId).toBeNull()
        expect(result.triggerPlayerId).toBeNull()
        expect(result.victoryType).toBeNull()
      })

      it('죽은 플레이어는 승리 조건을 트리거할 수 없다', () => {
        let state = createTestState()

        // 마왕 승리 조건을 갖추지만 죽어있는 플레이어
        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  state: 'corrupt' as const,
                  hasDemonSword: true,
                  position: templeTile.coord,
                  isDead: true,
                  devilScore: 10,
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)
        expect(result.hasWinner).toBe(false)
      })
    })

    describe('마왕 승리', () => {
      it('타락 + 마검 보유 + 신전 진입 시 마왕 승리 트리거', () => {
        let state = createTestState()

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  state: 'corrupt' as const,
                  hasDemonSword: true,
                  position: templeTile.coord,
                  devilScore: 5,
                  faithScore: 0,
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(true)
        expect(result.victoryType).toBe('demon_king')
        expect(result.triggerPlayerId).toBe('player-1')
      })

      it('마검이 없으면 마왕 승리 불가', () => {
        let state = createTestState()

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  state: 'corrupt' as const,
                  hasDemonSword: false,
                  position: templeTile.coord,
                  devilScore: 10,
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)
        expect(result.hasWinner).toBe(false)
      })

      it('신성 상태면 마왕 승리 불가', () => {
        let state = createTestState()

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  state: 'holy' as const,
                  hasDemonSword: true,
                  position: templeTile.coord,
                  devilScore: 10,
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)
        // 천사 승리 조건도 확인해야 함 (신앙 5점 미만이면 승리 없음)
        expect(result.victoryType).not.toBe('demon_king')
      })

      it('신전이 아니면 마왕 승리 불가', () => {
        let state = createTestState()
        const plainTile = GAME_BOARD.find(t => t.type === 'plain')!

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  state: 'corrupt' as const,
                  hasDemonSword: true,
                  position: plainTile.coord,
                  devilScore: 10,
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)
        expect(result.hasWinner).toBe(false)
      })

      it('마왕 승리 시 (마왕점수 - 신앙점수)가 가장 높은 플레이어가 승리', () => {
        let state = createTestState()

        state = {
          ...state,
          players: state.players.map(p => {
            if (p.id === 'player-1') {
              // 트리거하는 플레이어: 마왕 5, 신앙 2 = 3점
              return {
                ...p,
                state: 'corrupt' as const,
                hasDemonSword: true,
                position: templeTile.coord,
                devilScore: 5,
                faithScore: 2,
              }
            }
            if (p.id === 'player-2') {
              // 실제 승자: 마왕 8, 신앙 1 = 7점
              return {
                ...p,
                devilScore: 8,
                faithScore: 1,
              }
            }
            // player-3: 마왕 3, 신앙 0 = 3점
            return { ...p, devilScore: 3, faithScore: 0 }
          }),
        }

        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(true)
        expect(result.victoryType).toBe('demon_king')
        expect(result.triggerPlayerId).toBe('player-1')
        expect(result.winnerId).toBe('player-2') // 트리거와 승자가 다름!
      })
    })

    describe('천사 승리', () => {
      it('신성 + 신앙 5점 + 마왕성 진입 시 천사 승리 트리거', () => {
        let state = createTestState()

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  state: 'holy' as const,
                  position: castleTile.coord,
                  faithScore: 5,
                  devilScore: 0,
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(true)
        expect(result.victoryType).toBe('angel')
        expect(result.triggerPlayerId).toBe('player-1')
      })

      it('신앙 점수가 5점 미만이면 천사 승리 불가', () => {
        let state = createTestState()

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  state: 'holy' as const,
                  position: castleTile.coord,
                  faithScore: 4,
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)
        expect(result.hasWinner).toBe(false)
      })

      it('타락 상태면 천사 승리 불가', () => {
        let state = createTestState()

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  state: 'corrupt' as const,
                  position: castleTile.coord,
                  faithScore: 10,
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)
        // 마왕 승리 조건도 충족하지 않으면 승리 없음
        expect(result.victoryType).not.toBe('angel')
      })

      it('천사 승리 시 (신앙점수 - 마왕점수)가 가장 높은 플레이어가 승리', () => {
        let state = createTestState()

        state = {
          ...state,
          players: state.players.map(p => {
            if (p.id === 'player-1') {
              // 트리거하는 플레이어: 신앙 5, 마왕 3 = 2점
              return {
                ...p,
                state: 'holy' as const,
                position: castleTile.coord,
                faithScore: 5,
                devilScore: 3,
              }
            }
            if (p.id === 'player-2') {
              // 실제 승자: 신앙 7, 마왕 0 = 7점
              return {
                ...p,
                faithScore: 7,
                devilScore: 0,
              }
            }
            // player-3: 신앙 4, 마왕 1 = 3점
            return { ...p, faithScore: 4, devilScore: 1 }
          }),
        }

        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(true)
        expect(result.victoryType).toBe('angel')
        expect(result.triggerPlayerId).toBe('player-1')
        expect(result.winnerId).toBe('player-2') // 트리거와 승자가 다름!
      })
    })

    describe('계시 승리', () => {
      it('승리 계시 완료 시 해당 플레이어가 승리', () => {
        let state = createTestState()

        const gameEndRevelation: Revelation = {
          id: 'revelation-victory',
          name: '마왕 처단',
          source: 'angel',
          task: '마왕을 처단하라',
          reward: { faithScore: 5 },
          isGameEnd: true,
        }

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-2'
              ? {
                  ...p,
                  completedRevelations: [gameEndRevelation],
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)

        expect(result.hasWinner).toBe(true)
        expect(result.victoryType).toBe('revelation')
        expect(result.winnerId).toBe('player-2')
        expect(result.triggerPlayerId).toBe('player-2') // 계시 승리는 트리거와 승자가 같음
      })

      it('일반 계시 완료는 승리가 아니다', () => {
        let state = createTestState()

        const normalRevelation: Revelation = {
          id: 'revelation-normal',
          name: '제물 바치기',
          source: 'angel',
          task: '제물을 바쳐라',
          reward: { faithScore: 2 },
          isGameEnd: false,
        }

        state = {
          ...state,
          players: state.players.map(p =>
            p.id === 'player-1'
              ? {
                  ...p,
                  completedRevelations: [normalRevelation],
                }
              : p
          ),
        }

        const result = checkVictoryCondition(state)
        expect(result.hasWinner).toBe(false)
      })
    })

    describe('승리 우선순위', () => {
      it('마왕 승리가 천사 승리보다 먼저 체크된다', () => {
        let state = createTestState()

        // player-1: 마왕 승리 조건 충족 (타락 + 마검 + 신전)
        // player-2: 천사 승리 조건 충족 (신성 + 신앙 5점 + 마왕성)
        state = {
          ...state,
          players: state.players.map(p => {
            if (p.id === 'player-1') {
              return {
                ...p,
                state: 'corrupt' as const,
                hasDemonSword: true,
                position: templeTile.coord,
                devilScore: 10,
              }
            }
            if (p.id === 'player-2') {
              return {
                ...p,
                state: 'holy' as const,
                position: castleTile.coord,
                faithScore: 10,
              }
            }
            return p
          }),
        }

        const result = checkVictoryCondition(state)

        // player-1이 먼저 체크되므로 마왕 승리
        expect(result.victoryType).toBe('demon_king')
        expect(result.triggerPlayerId).toBe('player-1')
      })
    })
  })

  describe('handleGameOver', () => {
    it('GAME_OVER 이벤트를 생성한다', () => {
      const state = createTestState()
      const { events } = handleGameOver(state, 'player-1', 'demon_king')

      expect(events).toContainEqual({
        type: 'GAME_OVER',
        winnerId: 'player-1',
      })
    })
  })

  describe('getPlayerScores', () => {
    it('플레이어의 점수를 반환한다', () => {
      const state = createTestState()
      const player = {
        ...state.players[0],
        devilScore: 5,
        faithScore: 3,
      }

      const scores = getPlayerScores(player)

      expect(scores.devilScore).toBe(5)
      expect(scores.faithScore).toBe(3)
    })
  })

  describe('마검 뽑기', () => {
    it('타락 상태에서 마검 위치에서 마검을 뽑을 수 있다', () => {
      const engine = new GameEngine()
      let state = createTestState()

      // 마검 위치 확인
      const swordPos = state.demonSwordPosition!

      // player-1을 타락 상태로 만들고 마검 위치로 이동
      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? {
                ...p,
                state: 'corrupt' as const,
                position: swordPos,
                knowsDemonSwordPosition: true, // 마왕성 방문 완료
              }
            : p
        ),
      }

      const result = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'player-1')

      expect(result.success).toBe(true)
      const player = result.newState.players.find(p => p.id === 'player-1')
      expect(player?.hasDemonSword).toBe(true)
      expect(result.newState.demonSwordPosition).toBeNull()
    })

    it('마왕성 미방문 시 마검을 뽑을 수 없다', () => {
      const engine = new GameEngine()
      let state = createTestState()

      const swordPos = state.demonSwordPosition!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? {
                ...p,
                state: 'corrupt' as const,
                position: swordPos,
                knowsDemonSwordPosition: false, // 마왕성 미방문
              }
            : p
        ),
      }

      const result = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'player-1')

      expect(result.success).toBe(false)
      expect(result.message).toContain('마왕성')
    })

    it('신성 상태에서는 마검을 뽑을 수 없다', () => {
      const engine = new GameEngine()
      let state = createTestState()

      const swordPos = state.demonSwordPosition!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? {
                ...p,
                state: 'holy' as const,
                position: swordPos,
                knowsDemonSwordPosition: true,
              }
            : p
        ),
      }

      const result = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'player-1')

      expect(result.success).toBe(false)
      expect(result.message).toContain('타락')
    })

    it('마검 위치가 아니면 마검을 뽑을 수 없다', () => {
      const engine = new GameEngine()
      let state = createTestState()

      const plainTile = GAME_BOARD.find(t => t.type === 'plain')!

      state = {
        ...state,
        players: state.players.map(p =>
          p.id === 'player-1'
            ? {
                ...p,
                state: 'corrupt' as const,
                position: plainTile.coord,
                knowsDemonSwordPosition: true,
              }
            : p
        ),
      }

      const result = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'player-1')

      expect(result.success).toBe(false)
      expect(result.message).toContain('위치')
    })

    it('이미 누군가 마검을 가져갔으면 뽑을 수 없다', () => {
      const engine = new GameEngine()
      let state = createTestState()

      const swordPos = state.demonSwordPosition!

      state = {
        ...state,
        demonSwordPosition: null, // 이미 뽑힌 상태
        players: state.players.map(p =>
          p.id === 'player-1'
            ? {
                ...p,
                state: 'corrupt' as const,
                position: swordPos,
                knowsDemonSwordPosition: true,
              }
            : p
        ),
      }

      const result = engine.executeAction(state, { type: 'DRAW_DEMON_SWORD' }, 'player-1')

      expect(result.success).toBe(false)
      expect(result.message).toContain('이미')
    })
  })
})
