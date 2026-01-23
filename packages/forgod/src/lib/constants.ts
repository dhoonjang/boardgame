import type { Skill, Item, Revelation } from './types'

// 전사 스킬
export const WARRIOR_SKILLS: Skill[] = [
  {
    id: 'warrior-1',
    name: '일격 필살',
    description: '기본 공격의 피해에 힘 수치를 더한다',
    cost: 2,
    cooldown: 3,
    heroClass: 'warrior',
  },
  {
    id: 'warrior-2',
    name: '던져버리기',
    description: '대상을 최대 2칸 던진다. 산에다 던지면 힘 피해를 준다',
    cost: 2,
    cooldown: 3,
    heroClass: 'warrior',
  },
  {
    id: 'warrior-3',
    name: '무적 태세',
    description: '다음 턴까지 모든 피해를 자신의 힘 수치만큼 감소시킨다',
    cost: 2,
    cooldown: 3,
    heroClass: 'warrior',
  },
]

// 도적 스킬
export const ROGUE_SKILLS: Skill[] = [
  {
    id: 'rogue-1',
    name: '은신',
    description: '공격을 하거나 받기 전까지 지정 공격을 받지 않는다',
    cost: 2,
    cooldown: 3,
    heroClass: 'rogue',
  },
  {
    id: 'rogue-2',
    name: '배후 일격',
    description: '대상의 뒤로 이동하며 민첩 피해를 준다',
    cost: 2,
    cooldown: 2,
    heroClass: 'rogue',
  },
  {
    id: 'rogue-3',
    name: '독 바르기',
    description: '기본 공격의 피해에 민첩 수치를 더한다',
    cost: 1,
    cooldown: 1,
    heroClass: 'rogue',
  },
  {
    id: 'rogue-4',
    name: '그림자 함정',
    description: '현재 위치에 함정 설치 (최대 3개). 다른 용사가 밟으면 민첩 피해 + 숨김',
    cost: 1,
    cooldown: 2,
    heroClass: 'rogue',
  },
]

// 법사 스킬
export const MAGE_SKILLS: Skill[] = [
  {
    id: 'mage-1',
    name: '마법 화살',
    description: '대상에게 지능 피해 (용사 대상 사거리 2) - 강화 시: 분신이 공격',
    cost: 2,
    cooldown: 1,
    heroClass: 'mage',
  },
  {
    id: 'mage-2',
    name: '메테오',
    description: '원하는 타일에 지능 피해 - 강화 시: 지능x2 피해',
    cost: 4,
    cooldown: 3,
    heroClass: 'mage',
  },
  {
    id: 'mage-3',
    name: '스킬 강화',
    description: '나머지 스킬을 강화한다',
    cost: 2,
    cooldown: 0,
    heroClass: 'mage',
  },
]

export const ALL_SKILLS: Skill[] = [...WARRIOR_SKILLS, ...ROGUE_SKILLS, ...MAGE_SKILLS]

export const SKILLS_BY_CLASS = {
  warrior: WARRIOR_SKILLS,
  rogue: ROGUE_SKILLS,
  mage: MAGE_SKILLS,
}

// 아이템
export const ITEMS: Item[] = [
  // 전사 무기
  { id: 'item-1', name: '짐승파개', description: '몬스터 대상 힘 수치가 5 늘어난다', type: 'weapon', heroClass: 'warrior' },
  { id: 'item-2', name: '흡혈 대검', description: '용사 대상 기본 공격 시 가한 피해량의 절반만큼 체력 회복', type: 'weapon', heroClass: 'warrior' },

  // 도적 무기
  { id: 'item-3', name: '심판의 단검', description: '다른 상태의 용사 대상 민첩 수치가 3 늘어난다', type: 'weapon', heroClass: 'rogue' },

  // 법사 무기
  { id: 'item-4', name: '메테오 오브', description: '메테오의 스킬쿨이 1 감소한다', type: 'weapon', heroClass: 'mage' },
  { id: 'item-5', name: '저주 받은 주문서', description: '지능 수치를 3 늘려준다. 스킬 사용 시 체력 1 감소', type: 'weapon', heroClass: 'mage' },

  // 특수 무기
  { id: 'item-6', name: '마검', description: '타락 주사위를 모든 능력치에 적용. 몬스터와 싸울 수 없음. 신전 진입 시 승리', type: 'weapon', heroClass: 'cursed' },

  // 방어구
  { id: 'item-7', name: '강철 갑옷', description: '모든 피해를 3 감소. 이동 칸 1 감소', type: 'armor', heroClass: 'warrior' },
  { id: 'item-8', name: '죽음의 망토', description: '죽을 만큼 피해 시 주사위를 던져 짝수면 피해 무시', type: 'armor', heroClass: 'rogue' },
  { id: 'item-9', name: '투명 망토', description: '은신 쿨타임이 사라진다', type: 'armor', heroClass: 'rogue' },

  // 신발
  { id: 'item-10', name: '명석함의 장화', description: '이동 도중에 행동을 할 수 있다', type: 'boots', heroClass: 'all' },
  { id: 'item-11', name: '신속의 장화', description: '이동력이 1 증가한다', type: 'boots', heroClass: 'all' },
]

// 계시 카드 (샘플)
export const REVELATIONS: Revelation[] = [
  // 천사 계시
  { id: 'rev-1', name: '계시 기도', source: 'angel', task: '몬스터 제물 1개 신전에 바치기', reward: '계시 카드 2장', isVictory: false },
  { id: 'rev-2', name: '빨라져라', source: 'angel', task: '세모 1개 신전에 바치기', reward: '신속의 장화, 계시 카드 1장', isVictory: false },
  { id: 'rev-3', name: '명석한 그대에게', source: 'angel', task: '네모 1개 신전에 바치기', reward: '명석함의 장화, 계시 카드 1장', isVictory: false },

  // 마왕 계시
  { id: 'rev-4', name: '무기 하사', source: 'demon', task: '타락한 상태로 마왕성에 도착', reward: '체력 회복, 무기 1개 선택, 계시 카드 1장', isVictory: false },
  { id: 'rev-5', name: '타락 유혹', source: 'demon', task: '신성 상태로 다른 용사를 죽여라', reward: '타락 주사위 3으로 시작, 계시 카드 1장', isVictory: false },
]

// 게임 상수
export const INITIAL_HEALTH = 20
export const HEALTH_THRESHOLDS = [
  { strength: 5, totalStats: 12, maxHealth: 30 },
  { strength: 8, totalStats: 16, maxHealth: 40 },
  { strength: 10, totalStats: 20, maxHealth: 50 },
]

export const DEATH_RESPAWN_TURNS = 3

export const TILE_EFFECTS = {
  village: { selfClassHeal: 10, otherClassHeal: 5 },
  fire: { baseDamage: 10 }, // 10 - 타락 수치
  temple: { corruptDamage: 10 },
  castle: { holyDamage: 10 },
}
