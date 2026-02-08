export * from './types'
export * from './constants'
export { GameEngine } from './engine'
export { executeSwap } from './abilities'
export { executeRaise, executeCall, executeFold } from './betting'
export { resolveShowdown } from './showdown'

import type { AIPersonalityInfo } from './types'

export const AI_PERSONALITIES: AIPersonalityInfo[] = [
  { name: '무모한 도박사', description: '대담하고 무모한 성격. 큰 베팅과 블러프를 즐긴다.' },
  { name: '신중한 전략가', description: '차분하고 계산적. 확률을 따지며 신중하게 판단한다.' },
  { name: '포커페이스', description: '감정을 드러내지 않고 무표정하게 상대를 압박한다.' },
  { name: '수다쟁이', description: '말이 많고 상대를 심리적으로 흔든다. 진실과 거짓을 뒤섞는다.' },
  { name: '냉혈한 승부사', description: '냉정하고 효율적. 감정 없이 최적의 수를 둔다.' },
]
