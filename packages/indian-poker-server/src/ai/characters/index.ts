import type { AICharacter } from '../character'
import type { AICharacterInfo } from '../../game/types'
import { elonMusk } from './elon-musk'
import { kimJongyoun } from './kim-jongyoun'
import { warrenBuffett } from './warren-buffett'

const characters: AICharacter[] = [
  elonMusk,
  warrenBuffett,
  kimJongyoun,
]

const characterMap = new Map<string, AICharacter>(
  characters.map(c => [c.id, c])
)

export function getCharacter(id: string): AICharacter | undefined {
  return characterMap.get(id)
}

export function getDefaultCharacter(): AICharacter {
  return characters[0]
}

export function getRandomCharacter(): AICharacter {
  return characters[Math.floor(Math.random() * characters.length)]
}

export function getAllCharacterInfos(): AICharacterInfo[] {
  return characters.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    difficulty: c.difficulty,
    avatarUrl: c.avatarUrl,
  }))
}

export const AI_CHARACTERS: AICharacterInfo[] = getAllCharacterInfos()
