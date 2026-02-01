// Types
export * from './types'

// Constants
export * from './constants'

// Hex utilities
export * from './hex'

// Engine
export { GameEngine } from './engine/game-engine'
export type { GameEngineConfig, CreateGameOptions } from './engine/game-engine'

// Skills
export { useSkill, canUseSkill } from './engine/skills'
export type { SkillResult } from './engine/skills'

// Combat
export {
  calculateDamage,
  applyDamageToPlayer,
  applyDamageToMonster,
  healAtVillage,
  applyFireTileDamage,
  applyTileEntryDamage,
} from './engine/combat'
export type { DamageCalculation } from './engine/combat'

// Monsters
export {
  rollMonsterDice,
  processMonsterPhase,
  checkBalrogRespawn,
} from './engine/monsters'

// Revelations
export {
  drawRevelation,
  checkRevelationCondition,
  completeRevelation,
  createRevelationDeck,
} from './engine/revelations'
export type { RevelationResult } from './engine/revelations'

// Victory
export {
  checkVictoryCondition,
  handleGameOver,
  getPlayerScores,
} from './engine/victory'
export type { VictoryType, VictoryCheckResult } from './engine/victory'
