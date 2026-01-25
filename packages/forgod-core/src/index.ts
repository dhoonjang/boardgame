// Types
export * from './types.js'

// Constants
export * from './constants.js'

// Hex utilities
export * from './hex.js'

// Engine
export { GameEngine } from './engine/game-engine.js'
export type { GameEngineConfig, CreateGameOptions } from './engine/game-engine.js'

// Skills
export { useSkill, canUseSkill } from './engine/skills.js'
export type { SkillResult } from './engine/skills.js'

// Combat
export {
  calculateDamage,
  applyDamageToPlayer,
  applyDamageToMonster,
  healAtVillage,
  applyFireTileDamage,
  applyTileEntryDamage,
} from './engine/combat.js'
export type { DamageCalculation } from './engine/combat.js'

// Monsters
export {
  rollMonsterDice,
  processMonsterPhase,
  checkBalrogRespawn,
} from './engine/monsters.js'

// Revelations
export {
  drawRevelation,
  checkRevelationCondition,
  completeRevelation,
  createRevelationDeck,
} from './engine/revelations.js'
export type { RevelationResult } from './engine/revelations.js'

// Victory
export {
  checkVictoryCondition,
  handleGameOver,
  getPlayerScores,
} from './engine/victory.js'
export type { VictoryType, VictoryCheckResult } from './engine/victory.js'
