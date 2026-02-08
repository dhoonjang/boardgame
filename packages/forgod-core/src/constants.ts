import type { HeroClass, HexCoord, HexTile, Revelation, Skill, TileType } from './types'
import { coordToKey } from './types'

// 지형별 이동력 소모
// number: 고정 이동력 소모
// 'all': 남은 이동력 전부 소모 (언덕)
// 'blocked': 이동 불가 (산, 호수)
export const TERRAIN_MOVEMENT_COST: Record<TileType, number | 'all' | 'blocked'> = {
  plain: 3,
  village: 3,
  swamp: 5,
  fire: 3,
  temple: 3,
  castle: 3,
  monster: 'blocked',
  hill: 'all',
  mountain: 'blocked',
  lake: 'blocked',
}

// 전사 스킬
export const WARRIOR_SKILLS: Skill[] = [
  {
    id: 'warrior-charge',
    name: '돌진',
    description: '2칸 떨어진 대상에 근접한다. 원하는 스킬의 쿨을 1 줄인다',
    cost: 1,
    cooldown: 1,
    heroClass: 'warrior',
  },
  {
    id: 'warrior-power-strike',
    name: '일격 필살',
    description: '기본 공격의 피해에 힘 수치를 더한다',
    cost: 2,
    cooldown: 3,
    heroClass: 'warrior',
  },
  {
    id: 'warrior-throw',
    name: '던져버리기',
    description: '대상을 최대 2칸 던진다. 산에다 던지면 힘 피해를 준다',
    cost: 2,
    cooldown: 3,
    heroClass: 'warrior',
  },
  {
    id: 'warrior-iron-stance',
    name: '무적 태세',
    description: '다음 턴까지 모든 피해를 자신의 힘 수치만큼 감소시킨다',
    cost: 2,
    cooldown: 3,
    heroClass: 'warrior',
  },
  {
    id: 'warrior-sword-wave',
    name: '검기 발사',
    description: '자신의 앞 3칸에 힘 피해를 준다',
    cost: 3,
    cooldown: 3,
    heroClass: 'warrior',
  },
]

// 도적 스킬
export const ROGUE_SKILLS: Skill[] = [
  {
    id: 'rogue-poison',
    name: '독 바르기',
    description: '기본 공격의 피해에 민첩 수치를 더한다',
    cost: 1,
    cooldown: 1,
    heroClass: 'rogue',
  },
  {
    id: 'rogue-shadow-trap',
    name: '그림자 함정',
    description: '현재 위치에 함정 설치 (최대 3개). 다른 용사가 밟으면 민첩 피해 + 숨김',
    cost: 1,
    cooldown: 2,
    heroClass: 'rogue',
  },
  {
    id: 'rogue-backstab',
    name: '배후 일격',
    description: '대상의 뒤로 이동하며 민첩 피해를 준다 (대상의 뒤 칸으로 이동할 수 있어야 사용 가능)',
    cost: 2,
    cooldown: 2,
    heroClass: 'rogue',
  },
  {
    id: 'rogue-stealth',
    name: '은신',
    description: '공격을 하거나 받기 전까지 지정 공격을 받지 않는다',
    cost: 2,
    cooldown: 3,
    heroClass: 'rogue',
  },
  {
    id: 'rogue-shuriken',
    name: '무한의 표창',
    description: '일직선 상 만나는 첫 대상에게 민첩 피해. 2칸 이상 떨어져 있으면 민첩x2 피해 (산에 가로막힌다)',
    cost: 3,
    cooldown: 3,
    heroClass: 'rogue',
  },
]

// 법사 스킬
export const MAGE_SKILLS: Skill[] = [
  {
    id: 'mage-enhance',
    name: '스킬 강화',
    description: '나머지 스킬을 강화한다',
    cost: 2,
    cooldown: 0,
    heroClass: 'mage',
  },
  {
    id: 'mage-magic-arrow',
    name: '마법 화살',
    description: '대상에게 지능 피해 (용사 대상 사거리 2) - 강화 시: 분신이 공격',
    cost: 2,
    cooldown: 1,
    heroClass: 'mage',
  },
  {
    id: 'mage-clone',
    name: '분신',
    description: '현재 위치에 분신 생성 (분신은 지능 이상의 피해를 받으면 사라짐) - 강화 시: 분신 위치로 순간이동',
    cost: 2,
    cooldown: 2,
    heroClass: 'mage',
  },
  {
    id: 'mage-burst',
    name: '마력 방출',
    description: '자신의 주변 범위 1에 있는 모두에게 지능 피해 - 강화 시: 피해를 입은 대상이 한 칸씩 뒤로 밀려난다',
    cost: 3,
    cooldown: 2,
    heroClass: 'mage',
  },
  {
    id: 'mage-meteor',
    name: '메테오',
    description: '원하는 타일에 지능 피해 - 강화 시: 지능x2 피해',
    cost: 4,
    cooldown: 3,
    heroClass: 'mage',
  },
]

export const ALL_SKILLS: Skill[] = [...WARRIOR_SKILLS, ...ROGUE_SKILLS, ...MAGE_SKILLS]

export const SKILLS_BY_CLASS = {
  warrior: WARRIOR_SKILLS,
  rogue: ROGUE_SKILLS,
  mage: MAGE_SKILLS,
}

// 계시 카드
export const REVELATIONS: Revelation[] = [
  // ===== 천사 계시 =====
  {
    id: 'angel-1',
    name: '계시 기도',
    source: 'angel',
    task: '몬스터 제물 1개 신전에 바치기',
    reward: { extraRevelations: 2 },
    isGameEnd: false,
  },
  {
    id: 'angel-2',
    name: '동그라미 제물 바치기',
    source: 'angel',
    task: '동그라미 제물을 신전에 바치기',
    reward: { faithScore: 1, extraRevelations: 1 },  // 바친 수만큼 신앙 점수
    isGameEnd: false,
  },
  {
    id: 'angel-3',
    name: '세모 제물 바치기',
    source: 'angel',
    task: '세모 제물을 신전에 바치기',
    reward: { faithScore: 1, extraRevelations: 1 },  // 바친 수만큼 신앙 점수
    isGameEnd: false,
  },
  {
    id: 'angel-4',
    name: '네모 제물 바치기',
    source: 'angel',
    task: '네모 제물을 신전에 바치기',
    reward: { faithScore: 1, extraRevelations: 1 },  // 바친 수만큼 신앙 점수
    isGameEnd: false,
  },
  {
    id: 'angel-5',
    name: '발록 공격',
    source: 'angel',
    task: '발록을 공격해라',
    reward: { faithScore: 2, extraRevelations: 1 },
    isGameEnd: false,
  },
  {
    id: 'angel-6',
    name: '발록 처단',
    source: 'angel',
    task: '신성 상태로 발록을 죽여라',
    reward: { faithScore: 3 },
    isGameEnd: true,
  },
  {
    id: 'angel-7',
    name: '천사의 가호',
    source: 'angel',
    task: '타락 상태 용사로부터 죽을만큼 피해를 받는다',
    reward: { faithScore: 2, extraRevelations: 1 },  // 체력 모두 회복은 별도 처리
    isGameEnd: false,
  },
  {
    id: 'angel-8',
    name: '신의 승리',
    source: 'angel',
    task: '세모 3개, 네모 3개 신전에 바치기',
    reward: { faithScore: 5, extraRevelations: 1 },
    isGameEnd: false,
  },
  {
    id: 'angel-9',
    name: '마왕 처단',
    source: 'angel',
    task: '신앙 점수 5점 이상을 달성하고 마왕성에 진입',
    reward: { faithScore: 5 },
    isGameEnd: true,
  },

  // ===== 마왕 계시 =====
  {
    id: 'demon-1',
    name: '동그라미 제물 수습',
    source: 'demon',
    task: '동그라미 제물을 가지고 마왕성에 오라',
    reward: { devilScore: 1, corruptScore: 1, extraRevelations: 1 },  // 바친 수만큼 마왕 점수
    isGameEnd: false,
  },
  {
    id: 'demon-2',
    name: '세모 제물 수습',
    source: 'demon',
    task: '세모 제물을 가지고 마왕성에 오라',
    reward: { devilScore: 1, corruptScore: 1, extraRevelations: 1 },  // 바친 수만큼 마왕 점수
    isGameEnd: false,
  },
  {
    id: 'demon-3',
    name: '네모 제물 수습',
    source: 'demon',
    task: '네모 제물을 가지고 마왕성에 오라',
    reward: { devilScore: 1, corruptScore: 1, extraRevelations: 1 },  // 바친 수만큼 마왕 점수
    isGameEnd: false,
  },
  {
    id: 'demon-4',
    name: '선제 공격',
    source: 'demon',
    task: '신성한 상태로 다른 용사를 공격해라',
    reward: { devilScore: 1, corruptScore: 2, extraRevelations: 1 },  // 타락 전환 + 타락 주사위 2로 시작
    isGameEnd: false,
  },
  {
    id: 'demon-5',
    name: '성장',
    source: 'demon',
    task: '플레이어 중에서 가장 높은 레벨을 달성해라',
    reward: { devilScore: 2, extraRevelations: 1 },
    isGameEnd: false,
  },
  {
    id: 'demon-6',
    name: '마을 습격',
    source: 'demon',
    task: '마을 타일에 있는 용사를 공격해라',
    reward: { devilScore: 2, corruptScore: 1, extraRevelations: 1 },
    isGameEnd: false,
  },
  {
    id: 'demon-7',
    name: '배신',
    source: 'demon',
    task: '제물을 주고받았던 용사를 공격해라',
    reward: { devilScore: 3, extraRevelations: 1 },
    isGameEnd: false,
  },
  {
    id: 'demon-8',
    name: '타락 유혹',
    source: 'demon',
    task: '신성 상태로 다른 용사를 죽여라',
    reward: { devilScore: 3, corruptScore: 3, extraRevelations: 2 },  // 타락 주사위 3으로 시작
    isGameEnd: false,
  },
  {
    id: 'demon-9',
    name: '타락함 증명',
    source: 'demon',
    task: '타락 주사위 3 이상을 만들어라',
    reward: { devilScore: 3, extraRevelations: 2 },
    isGameEnd: false,
  },
  {
    id: 'demon-10',
    name: '마검 뽑기',
    source: 'demon',
    task: '마검을 획득해라',
    reward: { devilScore: 3, corruptScore: 3, extraRevelations: 1 },
    isGameEnd: false,
  },
]

// 게임 상수
export const INITIAL_HEALTH = 20

// 직업별 레벨 기반 최대 체력 테이블
// 레벨 = 가장 높은 능력치 수치 (타락 주사위 제외)
export const HEALTH_BY_CLASS_AND_LEVEL: Record<HeroClass, Record<number, number>> = {
  mage: {
    2: 20, 3: 20, 4: 20,   // Lv 2~4
    5: 20, 6: 20, 7: 20,   // Lv 5~7
    8: 30, 9: 30, 10: 30,  // Lv 8~10
    11: 40,                // Lv 11
    12: 50,                // Lv 12
  },
  rogue: {
    2: 20, 3: 20, 4: 20,   // Lv 2~4
    5: 30, 6: 30, 7: 30,   // Lv 5~7
    8: 40, 9: 40, 10: 40,  // Lv 8~10
    11: 50,                // Lv 11
    12: 50,                // Lv 12
  },
  warrior: {
    2: 30, 3: 30, 4: 30,   // Lv 2~4
    5: 30, 6: 30, 7: 30,   // Lv 5~7
    8: 40, 9: 40, 10: 40,  // Lv 8~10
    11: 50,                // Lv 11
    12: 50,                // Lv 12
  },
}

/**
 * 직업과 레벨에 따른 최대 체력 반환
 */
export function getMaxHealthByLevel(heroClass: HeroClass, level: number): number {
  const clampedLevel = Math.max(2, Math.min(12, level))
  return HEALTH_BY_CLASS_AND_LEVEL[heroClass][clampedLevel] ?? INITIAL_HEALTH
}

export const DEATH_RESPAWN_TURNS = 3

export const TILE_EFFECTS = {
  village: { selfClassHeal: 10, otherClassHeal: 5 },
  fire: { baseDamage: 10 },
  temple: { corruptDamage: 0 },  // 타락 용사 신전 진입 불가 (마검 보유 시 가능, 피해 없음)
  castle: { holyDamage: 0 },     // 마왕성 진입 시 피해 없음
}

// 게임 규칙 텍스트
export const GAME_RULES = `
# For God 게임 규칙

## 게임 개요
For God는 3~6인용 전략 보드게임입니다. 플레이어들은 용사가 되어 신과 마왕의 계시를 수행하며 점수를 획득합니다.

## 직업
- **전사 (Warrior)**: 힘에 특화된 근접 전투 전문가
- **도적 (Rogue)**: 민첩성을 활용한 기습과 함정 전문가
- **법사 (Mage)**: 지능을 사용하는 원거리 마법 전문가

## 상태
- **신성 (Holy)**: 천사의 계시를 수행 가능, 화염 타일에서 피해를 받음
- **타락 (Corrupt)**: 마왕의 계시를 수행 가능, 신전 진입 불가 (마검 보유 시 가능), 화염 타일 피해 면역

## 게임 진행
1. **이동 단계**: 주사위를 굴려 이동 (2d6 + 민첩 수치)
2. **행동 단계**: 공격, 스킬 사용, 능력치 업그레이드
3. **몬스터 단계**: 몬스터 주사위 6개 굴려서 행동

## 승리 조건
- **마왕 승리**: 타락 용사가 마검 획득 후 신전 진입 → (마왕 점수 - 신앙 점수) 최고자 승리
- **천사 승리**: 게임 종료 천사 계시 수행 → (신앙 점수 - 마왕 점수) 최고자 승리
`

// ===== 몬스터 정의 =====

// 몬스터가 드롭하는 제물 (처치 시 획득)
export interface MonsterDrops {
  circle: number    // 동그라미(●)
  triangle: number  // 세모(▲)
  square: number    // 네모(■)
}

export interface MonsterDefinition {
  id: string
  name: string
  nameKo: string
  position: HexCoord
  maxHealth: number
  diceIndices: number[]  // 2~6개의 주사위 인덱스
  drops: MonsterDrops    // 처치 시 드롭하는 제물
  adjacentTiles: HexCoord[]  // 인접한 이동 가능 타일들 (0번부터 순서대로)
  description: string
}

export const MONSTERS: MonsterDefinition[] = [
  {
    id: 'harpy',
    name: 'Harpy',
    nameKo: '하피',
    position: { q: 7, r: -3 },
    maxHealth: 20,
    diceIndices: [0, 1, 2],  // 주사위 1, 2, 3
    drops: { circle: 1, triangle: 1, square: 0 },
    adjacentTiles: [
      { q: 7, r: -4 },   // 0: 좌상 방향, 평지
      { q: 6, r: -2 },   // 1: 좌하 방향, 평지
      { q: 7, r: -2 },   // 2: 우하 방향, 평지
    ],
    description: '주사위 합이 7 이상이면 피해를 준 후에 인접한 용사들을 한 칸 밀어냄',
  },
  {
    id: 'grindylow',
    name: 'Grindylow',
    nameKo: '그린딜로',
    position: { q: -7, r: 3 },
    maxHealth: 25,
    diceIndices: [1, 3],  // 주사위 2, 4
    drops: { circle: 0, triangle: 1, square: 1 },
    adjacentTiles: [
      { q: -6, r: 3 },   // 0: 오른쪽 방향, 늪
      { q: -6, r: 2 },   // 1: 우상 방향, 늪
      { q: -7, r: 2 },   // 2: 좌상 방향, 늪
    ],
    description: '주사위 합이 7 이상이면 피해 받은 용사가 속박됨',
  },
  {
    id: 'lich',
    name: 'Lich',
    nameKo: '리치',
    position: { q: 6, r: 3 },
    maxHealth: 30,
    diceIndices: [3, 4, 5],  // 주사위 4, 5, 6
    drops: { circle: 3, triangle: 1, square: 1 },
    adjacentTiles: [
      { q: 7, r: 2 },    // 0: 우상 방향, 평지
      { q: 6, r: 2 },    // 1: 좌상 방향, 평지
      { q: 5, r: 3 },    // 2: 왼쪽 방향, 평지
      { q: 5, r: 4 },    // 3: 좌하 방향, 평지
    ],
    description: '주사위 합이 15 이상이면 몬스터들이 메테오 피해 무시',
  },
  {
    id: 'troll',
    name: 'Troll',
    nameKo: '트롤',
    position: { q: -6, r: 8 },
    maxHealth: 35,
    diceIndices: [0, 5],  // 주사위 1, 6
    drops: { circle: 1, triangle: 0, square: 2 },
    adjacentTiles: [
      { q: -5, r: 8 },   // 0: 오른쪽 방향, 언덕
      { q: -5, r: 7 },   // 1: 우상 방향, 언덕
      { q: -6, r: 7 },   // 2: 좌상 방향, 언덕
      { q: -7, r: 8 },   // 3: 왼쪽 방향, 언덕
      { q: -6, r: 9 },   // 4: 우하 방향, 언덕
    ],
    description: '타락한 용사에게는 주사위 합이 홀수일 때만 공격',
  },
  {
    id: 'hydra',
    name: 'Hydra',
    nameKo: '히드라',
    position: { q: -7, r: -2 },
    maxHealth: 40,
    diceIndices: [0, 1, 4, 5],  // 주사위 1, 2, 5, 6
    drops: { circle: 2, triangle: 4, square: 1 },
    adjacentTiles: [
      { q: -6, r: -2 },  // 0: 오른쪽 방향, 늪
      { q: -8, r: -1 },  // 1: 좌하 방향, 늪
      { q: -7, r: -1 },  // 2: 우하 방향, 늪
    ],
    description: '주사위 합이 15 이상이면 잃은 체력의 두 배 회복',
  },
  {
    id: 'golem',
    name: 'Golem',
    nameKo: '골렘',
    position: { q: 7, r: -8 },
    maxHealth: 50,
    diceIndices: [4, 5],  // 주사위 5, 6
    drops: { circle: 1, triangle: 1, square: 3 },
    adjacentTiles: [
      { q: 8, r: -8 },   // 0: 오른쪽 방향, 평지
      { q: 8, r: -9 },   // 1: 우상 방향, 평지
      { q: 7, r: -9 },   // 2: 좌상 방향, 평지
      { q: 6, r: -8 },   // 3: 왼쪽 방향, 평지
    ],
    description: '주사위 합이 12면 기본 공격 피해 무시',
  },
  {
    id: 'balrog',
    name: 'Balrog',
    nameKo: '발록',
    position: { q: 0, r: 8 },
    maxHealth: 60,
    diceIndices: [0, 1, 2, 3, 4, 5],  // 주사위 1, 2, 3, 4, 5, 6
    drops: { circle: 3, triangle: 3, square: 3 },
    adjacentTiles: [
      { q: 1, r: 7 },    // 0: 우상 방향, 평지
      { q: 0, r: 7 },    // 1: 좌상 방향, 평지
      { q: -1, r: 8 },   // 2: 왼쪽 방향, 평지
    ],
    description: '발록이 죽으면 화염 타일이 피해를 주지 않음',
  },
]

// ===== 보드 빌더 =====

/**
 * 보드 빌더 클래스 - 코드로 쉽게 보드를 구성
 */
class BoardBuilder {
  private tiles: Map<string, HexTile> = new Map()

  /**
   * 반지름 기반으로 기본 타일 생성
   */
  createBase(radius: number, defaultType: TileType = 'plain'): this {
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius)
      const r2 = Math.min(radius, -q + radius)
      for (let r = r1; r <= r2; r++) {
        const coord = { q, r }
        this.tiles.set(coordToKey(coord), { coord, type: defaultType })
      }
    }
    return this
  }

  /**
   * 단일 타일 설정
   */
  setTile(q: number, r: number, type: TileType, villageClass?: HeroClass): this {
    const coord = { q, r }
    const key = coordToKey(coord)
    if (this.tiles.has(key)) {
      this.tiles.set(key, { coord, type, villageClass })
    }
    return this
  }

  /**
   * 여러 좌표에 같은 타일 타입 설정
   */
  setTiles(coords: Array<[number, number]>, type: TileType): this {
    for (const [q, r] of coords) {
      this.setTile(q, r, type)
    }
    return this
  }

  /**
   * 특정 거리의 링(원) 전체에 타일 설정
   */
  setRing(distance: number, type: TileType): this {
    if (distance === 0) {
      this.setTile(0, 0, type)
      return this
    }
    let coord: HexCoord = { q: distance, r: 0 }
    const directions: HexCoord[] = [
      { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 },
      { q: 0, r: 1 }, { q: 1, r: 0 }, { q: 1, r: -1 },
    ]
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < distance; j++) {
        this.setTile(coord.q, coord.r, type)
        coord = { q: coord.q + directions[i].q, r: coord.r + directions[i].r }
      }
    }
    return this
  }

  /**
   * 좌표 범위에 타일 설정 (사각형 영역)
   */
  setArea(qMin: number, qMax: number, rMin: number, rMax: number, type: TileType): this {
    for (let q = qMin; q <= qMax; q++) {
      for (let r = rMin; r <= rMax; r++) {
        this.setTile(q, r, type)
      }
    }
    return this
  }

  /**
   * 두 점 사이의 직선에 타일 설정
   */
  setLine(q1: number, r1: number, q2: number, r2: number, type: TileType): this {
    const distance = Math.max(Math.abs(q2 - q1), Math.abs(r2 - r1), Math.abs((q1 + r1) - (q2 + r2)))
    for (let i = 0; i <= distance; i++) {
      const t = distance === 0 ? 0 : i / distance
      const q = Math.round(q1 + (q2 - q1) * t)
      const r = Math.round(r1 + (r2 - r1) * t)
      this.setTile(q, r, type)
    }
    return this
  }

  /**
   * 마을 설정 (직업 포함)
   */
  setVillage(q: number, r: number, heroClass: HeroClass): this {
    return this.setTile(q, r, 'village', heroClass)
  }

  /**
   * 몬스터 타일 설정 (ID만 넣으면 MONSTERS에서 자동으로 이름 조회)
   */
  setMonster(q: number, r: number, id: string): this {
    const monster = MONSTERS.find(m => m.id === id)
    if (!monster) {
      return this
    }
    const coord = { q, r }
    const key = coordToKey(coord)
    if (this.tiles.has(key)) {
      this.tiles.set(key, { coord, type: 'monster', monsterId: id, monsterName: monster.nameKo })
    }
    return this
  }

  /**
   * 단일 타일 삭제
   */
  deleteTile(q: number, r: number): this {
    const key = coordToKey({ q, r })
    this.tiles.delete(key)
    return this
  }

  /**
   * 여러 타일 삭제
   */
  deleteTiles(coords: Array<[number, number]>): this {
    for (const [q, r] of coords) {
      this.deleteTile(q, r)
    }
    return this
  }

  deleteLine(q1: number, r1: number, q2: number, r2: number): this {
    const distance = Math.max(Math.abs(q2 - q1), Math.abs(r2 - r1), Math.abs((q1 + r1) - (q2 + r2)))
    for (let i = 0; i <= distance; i++) {
      const t = distance === 0 ? 0 : i / distance
      const q = Math.round(q1 + (q2 - q1) * t)
      const r = Math.round(r1 + (r2 - r1) * t)
      this.deleteTile(q, r)
    }
    return this
  }
  /**
   * 특정 거리의 링 전체 삭제
   */
  deleteRing(distance: number): this {
    if (distance === 0) {
      this.deleteTile(0, 0)
      return this
    }
    let coord: HexCoord = { q: distance, r: 0 }
    const directions: HexCoord[] = [
      { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 },
      { q: 0, r: 1 }, { q: 1, r: 0 }, { q: 1, r: -1 },
    ]
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < distance; j++) {
        this.deleteTile(coord.q, coord.r)
        coord = { q: coord.q + directions[i].q, r: coord.r + directions[i].r }
      }
    }
    return this
  }

  /**
   * 배열로 변환
   */
  build(): HexTile[] {
    return Array.from(this.tiles.values())
  }
}

/**
 * 새 보드 빌더 생성
 */
export function createBoardBuilder(): BoardBuilder {
  return new BoardBuilder()
}

// ===== 게임 보드 맵 정의 =====

/**
 * 이미지 기반 고정 게임 보드
 * 반지름 6의 큰 헥스 보드
 */
export const GAME_BOARD: HexTile[] = createBoardBuilder()
  // 1. 기본 평지로 반지름 8 보드 생성
  .createBase(9, 'plain')

  // 9. 신전 (남쪽 중앙)
  .setTile(0, 0, 'temple')

  // 10. 마을 배치 (직업별)
  .setVillage(0, -1, 'warrior')  // 전사 마을 (북서쪽, 화염 근처)
  .setVillage(-1, 0, 'warrior')  // 전사 마을 (북서쪽, 화염 근처)
  .setVillage(-1, -1, 'warrior')  // 전사 마을 (북서쪽, 화염 근처)

  .setVillage(1, -1, 'mage')      // 법사 마을 (동쪽)
  .setVillage(1, 0, 'mage')      // 법사 마을 (동쪽)
  .setVillage(2, -1, 'mage')      // 법사 마을 (동쪽)

  .setVillage(0, 1, 'rogue')     // 도적 마을 (남서쪽)
  .setVillage(-1, 1, 'rogue')      // 도적 마을 (남서쪽)
  .setVillage(-1, 2, 'rogue')      // 도적 마을 (남서쪽)

  // === 산맥 ===
  // 북서쪽 산맥
  .setLine(-2,-4, 1,-6, 'mountain')
  .setLine(-2,-7, -4, -5, 'mountain')
  .setLine(0,-3, 1, -4, 'mountain')
  // 북동쪽 산맥
  .setLine(4, -9, 2, -9, 'mountain')
  .setLine(5, -7, 7, -7, 'mountain')
  .setTiles([[5, -6], [6, -6]], 'mountain')
  // 남서쪽 산맥
  .setLine(-9, 8 , -7, 9, 'mountain')
  .setLine(-5, 9, -2, 9, 'mountain')
  .setTile(-9, 9, 'mountain')
  // 남동쪽 산맥
  .setLine(7, 1, 9, -1, 'mountain')
  .setTiles([[8, 1], [9, 0]], 'mountain')
  
  .setLine(-2,5,3,1 ,'mountain')

  // === 호수 ===
  // 서쪽 큰 호수
  .setLine(-9, 0, -9, 7, 'lake')
  .setLine(-8, 0, -8, 6, 'lake')
  .setLine(-5, 0, -5, 1, 'lake')
  
  .setTile(-7, 4, 'lake')
  .setTiles([[-5, -4], [-4, -4], [-5, -3], [-6, -3], [-7, 0], [-5, -2], [-4, 0], [-4,1]], 'lake')
  // 동쪽 호수
  .setTiles([[5, -3], [5, -2], [6, -4], [6, -3]], 'lake')
  // 발록 오른쪽 길 호수 (동쪽에서 발록 접근 차단)

  // === 언덕 ===
  // 남서쪽 언덕
  .setLine(-8, 7, -2, 7, 'hill')
  .setLine(-7, 8, -2, 8, 'hill')
  .setLine(-6,5, -3,5, 'hill')
  .setTile(-5,5,'mountain')
  .setTile(2,2,'hill')
  .setTiles([[-6, 9],[-7,6]], 'hill')
  // 북쪽 언덕
  .setTiles([[2, -4], [3, -4], [3, -5], [4, -5]], 'hill')
  .setTiles([[8, -4], [8, -3], [9, -6], [9, -5], [9, -4]], 'lake')
  // 남동쪽 언덕
  .setTiles([[3, 5], [2, 6], [3, 6], [2, 7]], 'mountain')

  // === 늪 ===
  // 서쪽 늪
  .setTiles([
    [-8, -1], [-7, -1], [-6, -2], [-6, -1], [-6, 0], [-6, 1], [-6, 2], [-6, 3], [-7, 1], [-7, 2]
  ], 'swamp')
  // 동쪽 늪
  .setTiles([[7, 0], [8, -1], [8, -2], [9, -2], [9, -3]], 'lake')
  .setTiles([[4, -4], [5, -4], [5, -5], [6, -5]], 'swamp')

  // === 화염 ===
  // 남쪽 화염 지역
  .setTiles([[-1, 7], [0, 6], [1, 6]], 'fire')
  // 마왕성 가는 길목 화염 (북쪽 장벽)
  .setTiles([[-2, -6], [-2, -5], [2, -7], [3, -8]], 'fire')

  .deleteTiles([[-1, 9], [0, 9], [1, 8], [-1, -8], [0, -9], [1, -9]])

  // 8. 마왕성 (북쪽 중앙)
  .setTile(0, -8, 'castle')

  .setMonster(-7, -2, 'hydra')
  .setMonster(-7, 3, 'grindylow')
  .setMonster(-6, 8, 'troll')
  .setMonster(7, -8, 'golem')
  .setMonster(7, -3, 'harpy')
  .setMonster(0, 8, 'balrog')
  .setMonster(6, 3, 'lich') 

  .build()

// 직업별 시작 가능 위치 (신전에 인접한 자기 직업 마을 타일들)
// 신전 위치: (0, 0)
// 같은 직업의 플레이어가 여러 명일 경우 순서대로 배치됨
export const STARTING_POSITIONS: Record<HeroClass, HexCoord[]> = {
  warrior: [{ q: 0, r: -1 }, { q: -1, r: 0 }],  // 전사 마을 중 신전 인접
  mage: [{ q: 1, r: -1 }, { q: 1, r: 0 }],      // 법사 마을 중 신전 인접
  rogue: [{ q: 0, r: 1 }, { q: -1, r: 1 }],     // 도적 마을 중 신전 인접
}
