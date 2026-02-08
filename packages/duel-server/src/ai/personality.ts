import type { AIPersonality } from './types'

export const PRESETS: AIPersonality[] = [
  {
    name: '무모한 도박사',
    aggressiveness: 0.8,
    bluffRate: 0.4,
    expressiveness: 0.8,
    chattiness: 0.7,
    speechDeception: 0.8,
    description: '대담하고 무모한 성격. 큰 베팅을 즐기고 블러프를 자주 걸어. 말로도 상대를 속이는 걸 즐겨.',
  },
  {
    name: '신중한 전략가',
    aggressiveness: 0.3,
    bluffRate: 0.15,
    expressiveness: 0.4,
    chattiness: 0.5,
    speechDeception: 0.4,
    description: '차분하고 계산적인 성격. 확률을 따지며 신중하게 판단해. 말도 비교적 솔직한 편이지만 필요하면 속여.',
  },
  {
    name: '포커페이스',
    aggressiveness: 0.5,
    bluffRate: 0.25,
    expressiveness: 0.15,
    chattiness: 0.3,
    speechDeception: 0.5,
    description: '감정을 드러내지 않는 성격. 무표정하게 상대를 압박해. 말을 아끼지만 할 때는 진실과 거짓을 섞어.',
  },
  {
    name: '수다쟁이',
    aggressiveness: 0.5,
    bluffRate: 0.3,
    expressiveness: 0.9,
    chattiness: 0.95,
    speechDeception: 0.7,
    description: '말이 많고 상대를 심리적으로 흔드는 성격. 끊임없이 말을 걸면서 진실과 거짓을 뒤섞어.',
  },
  {
    name: '냉혈한 승부사',
    aggressiveness: 0.65,
    bluffRate: 0.2,
    expressiveness: 0.3,
    chattiness: 0.4,
    speechDeception: 0.55,
    description: '냉정하고 효율적인 성격. 감정 없이 최적의 수를 둬. 속일 때와 솔직할 때를 전략적으로 선택해.',
  },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function jitter(): number {
  return (Math.random() - 0.5) * 0.4 // ±0.1
}

function applyJitter(base: AIPersonality): AIPersonality {
  return {
    ...base,
    aggressiveness: clamp(base.aggressiveness + jitter(), 0, 1),
    bluffRate: clamp(base.bluffRate + jitter(), 0, 0.5),
    expressiveness: clamp(base.expressiveness + jitter(), 0, 1),
    chattiness: clamp(base.chattiness + jitter(), 0, 1),
    speechDeception: clamp(base.speechDeception + jitter(), 0.2, 0.9),
  }
}

export function getPersonalityByName(name: string): AIPersonality | undefined {
  const base = PRESETS.find(p => p.name === name)
  if (!base) return undefined
  return applyJitter(base)
}

export function generatePersonality(name?: string): AIPersonality {
  if (name) {
    const matched = getPersonalityByName(name)
    if (matched) return matched
  }
  const base = PRESETS[Math.floor(Math.random() * PRESETS.length)]
  return applyJitter(base)
}
