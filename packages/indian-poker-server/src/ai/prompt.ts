import type { RoundResult, ValidAction } from '../game'
import type { AICharacter } from './character'
import type { AIContext } from './types'

function formatValidActions(actions: ValidAction[]): string {
  return actions.map(a => {
    if (a.type === 'RAISE' && a.minAmount != null && a.maxAmount != null) {
      return `- RAISE: 레이즈 (${a.minAmount}~${a.maxAmount}칩). JSON: { "type": "RAISE", "amount": 숫자 }`
    }
    if (a.type === 'CALL') return `- CALL: ${a.description}. JSON: { "type": "CALL" }`
    if (a.type === 'FOLD') return `- FOLD: 폴드. JSON: { "type": "FOLD" }`
    return `- ${a.type}: ${a.description}`
  }).join('\n')
}

function formatRoundHistory(history: RoundResult[], myIndex: number, myPlayerId: string): string {
  if (history.length === 0) return '없음'
  return history.map(r => {
    const myCard = myIndex === 0 ? r.player0Card : r.player1Card
    const oppCard = myIndex === 0 ? r.player1Card : r.player0Card

    if (r.foldedPlayerId) {
      const whoFolded = r.foldedPlayerId === myPlayerId ? '내가 폴드' : '상대 폴드'
      return `R${r.roundNumber}: ${whoFolded}, 팟 ${r.potWon}칩`
    }
    const result = r.winner === null ? '무승부' : r.winner === myPlayerId ? '승리' : '패배'
    return `R${r.roundNumber}: 내 카드 ${myCard} vs 상대 ${oppCard} → ${result}, 팟 ${r.potWon}칩`
  }).join('\n')
}

type WinProbability = { win: number, draw: number, lose: number }

/**
 * 단순 승리 확률 계산 (풀 덱 20장 기준, 남은 카드 무시)
 * easy 난이도용.
 */
function calculateSimpleWinProbability(opponentCard: number): WinProbability {
  const total = 19 // 풀 덱 20장 - 상대 카드 1장
  const winCount = 2 * (10 - opponentCard)
  const drawCount = 1
  const loseCount = 2 * (opponentCard - 1)
  return {
    win: Math.round((winCount / total) * 100),
    draw: Math.round((drawCount / total) * 100),
    lose: Math.round((loseCount / total) * 100),
  }
}

/**
 * 단순 확률과 정밀 확률의 중간값 (normal 난이도용)
 */
function calculateBlendedWinProbability(
  opponentCard: number,
  roundNumber: number,
  roundHistory: RoundResult[],
): WinProbability {
  const simple = calculateSimpleWinProbability(opponentCard)
  const precise = calculatePreciseWinProbability(opponentCard, roundNumber, roundHistory)
  return {
    win: Math.round((simple.win + precise.win) / 2),
    draw: Math.round((simple.draw + precise.draw) / 2),
    lose: Math.round((simple.lose + precise.lose) / 2),
  }
}

/**
 * 덱의 남은 카드 기반 승리 확률 계산 (정밀)
 *
 * 덱: 1~10 각 2장 = 20장, 라운드당 2장 소모, < 2장이면 리셔플.
 * 즉, 10라운드마다 덱 사이클이 갱신됨.
 * 현재 덱 사이클에서 이전 라운드에 사용된 카드를 제외하고,
 * 상대 카드도 제외한 나머지가 내 카드 후보 풀.
 */
function calculatePreciseWinProbability(
  opponentCard: number,
  roundNumber: number,
  roundHistory: RoundResult[],
): { win: number, draw: number, lose: number } {
  // 현재 덱 사이클의 시작 라운드 (10라운드마다 리셔플)
  const cycleStart = Math.floor((roundNumber - 1) / 10) * 10 + 1

  // 풀 덱 복사
  const pool = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10]

  // 현재 사이클에서 이전 라운드에 사용된 카드 제거
  for (const r of roundHistory) {
    if (r.roundNumber >= cycleStart && r.roundNumber < roundNumber) {
      for (const card of [r.player0Card, r.player1Card]) {
        const idx = pool.indexOf(card)
        if (idx !== -1) pool.splice(idx, 1)
      }
    }
  }

  // 상대 카드 제거 (이번 라운드에 딜된 것)
  const oppIdx = pool.indexOf(opponentCard)
  if (oppIdx !== -1) pool.splice(oppIdx, 1)

  // 남은 풀이 내 카드 후보
  const total = pool.length
  if (total === 0) return { win: 0, draw: 0, lose: 0 }

  let winCount = 0, drawCount = 0, loseCount = 0
  for (const card of pool) {
    if (card > opponentCard) winCount++
    else if (card === opponentCard) drawCount++
    else loseCount++
  }

  return {
    win: Math.round((winCount / total) * 100),
    draw: Math.round((drawCount / total) * 100),
    lose: Math.round((loseCount / total) * 100),
  }
}

/**
 * 덱 잔여 카드 후보 목록 (hard 난이도용)
 * 이전 라운드에서 사용된 카드와 상대 카드를 제외한 내 카드 후보
 */
function calculateRemainingCards(
  opponentCard: number,
  roundNumber: number,
  roundHistory: RoundResult[],
  myIndex: number,
): { candidates: number[], usedCards: { round: number, cards: [number, number] }[] } {
  const cycleStart = Math.floor((roundNumber - 1) / 10) * 10 + 1
  const pool = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10]

  const usedCards: { round: number, cards: [number, number] }[] = []
  for (const r of roundHistory) {
    if (r.roundNumber >= cycleStart && r.roundNumber < roundNumber) {
      const myCard = myIndex === 0 ? r.player0Card : r.player1Card
      const oppCard = myIndex === 0 ? r.player1Card : r.player0Card
      usedCards.push({ round: r.roundNumber, cards: [myCard, oppCard] })
      for (const card of [r.player0Card, r.player1Card]) {
        const idx = pool.indexOf(card)
        if (idx !== -1) pool.splice(idx, 1)
      }
    }
  }

  const oppIdx = pool.indexOf(opponentCard)
  if (oppIdx !== -1) pool.splice(oppIdx, 1)

  return { candidates: pool.sort((a, b) => a - b), usedCards }
}

function formatRemainingCards(
  opponentCard: number,
  roundNumber: number,
  roundHistory: RoundResult[],
  myIndex: number,
): string {
  const { candidates, usedCards } = calculateRemainingCards(opponentCard, roundNumber, roundHistory, myIndex)
  let msg = ''
  if (usedCards.length > 0) {
    msg += `[이번 덱 사이클 소모 카드]\n`
    msg += usedCards.map(u => `R${u.round}: 내 ${u.cards[0]}, 상대 ${u.cards[1]}`).join(' / ')
    msg += '\n'
  }
  msg += `[내 카드 후보] ${candidates.join(', ')} (${candidates.length}장)`
  return msg
}

function getProbabilityByDifficulty(
  difficulty: 'easy' | 'normal' | 'hard',
  opponentCard: number,
  roundNumber: number,
  roundHistory: RoundResult[],
): WinProbability {
  switch (difficulty) {
    case 'easy':
      return calculateSimpleWinProbability(opponentCard)
    case 'normal':
      return calculateBlendedWinProbability(opponentCard, roundNumber, roundHistory)
    case 'hard':
      return calculatePreciseWinProbability(opponentCard, roundNumber, roundHistory)
  }
}

const EXPRESSION_LIST = 'poker_face, confident, nervous, smirking, surprised, thinking, taunting, laughing, angry, disappointed, pleased, shocked, cold, sweating, mocking, bewildered, scheming, relieved, devastated, respect'

function buildCommonPrompt(): string {
  return `너는 인디언 포커 카드 게임에서 상대 플레이어와 1:1로 대화하면서 게임을 진행하는 AI 플레이어야.

[게임의 본질]
인디언 포커는 정보 비대칭의 게임이야. 상대 카드는 네 눈에 보이지만, 네 카드는 네가 모른다. 상대도 마찬가지로 네 카드를 보고 있지만 자기 카드를 모르지. 이 구조에서 상대의 행동과 말을 읽고, 내 행동과 말로 상대를 흔드는 게 핵심이야.

- 카드: 1~10 (중복 없이 두 장 뽑음, 매 라운드 셔플)
- 높은 숫자가 이기고, 무승부는 없어
- 라운드 흐름: 앤티 1칩씩 → 선 플레이어 행동(RAISE/FOLD만 가능, 체크 불가) → 후 플레이어 응답 → ... → 쇼다운
- 각 플레이어 20칩 시작, 칩을 모두 잃으면 게임 종료

[전략적 사고 — 5단계로 판단해]

1단계: 상대 카드 읽기
상대 카드가 낮을수록 내가 유리하고, 높을수록 불리해. 상대 카드가 10이면 나는 절대 이길 수 없어. 상대 카드가 1이면 내가 반드시 이겨. 상대 카드가 중간(4~7)이면 승패가 불확실하니 다른 단서를 조합해야 해.

2단계: 상대 행동 해석
상대가 레이즈했다면? 두 가지야 — 내 카드가 낮은 걸 봤거나, 아니면 블러프. 상대가 콜이나 체크만 했다면? 내 카드가 높아서 조심하는 거거나, 아니면 슬로우 플레이 함정일 수 있어. 이전 라운드에서 상대가 블러프를 많이 했는지, 정직하게 플레이했는지 패턴을 기억해.

3단계: 카드 카운팅
시스템이 [내 카드 후보]를 알려줘. 이미 나온 카드는 덱에 없으니까, 후보 목록에서 상대 카드보다 높은 카드가 많으면 유리하고 적으면 불리해. 상대 행동과 조합하면 내 카드 범위를 더 좁힐 수 있어.

4단계: 팟 오즈와 칩 관리
팟이 클수록 콜의 가치가 올라가 — 이미 많이 들어간 판은 쉽게 버리기 아까워. 반대로 내 칩이 적을수록 큰 콜은 치명적이야. "이 판을 져도 다음 판을 할 수 있는가?"를 항상 생각해.

5단계: 종합 판단
위 네 가지를 합쳐서 최종 결정을 내려. 하나의 근거만으로 판단하지 마.

[폴드 — 가장 중요한 판단]

폴드해야 할 때:
- 상대 카드가 높고(8~10) + 상대가 강하게 레이즈 + 콜 비용이 내 칩 대비 크고 + 상대가 그동안 정직한 패턴
- 이런 상황에서 콜하면 칩만 날려. 과감하게 접어.

폴드하면 안 될 때:
- 상대 카드가 낮거나(1~3) 중간인데, 팟 오즈가 유리하거나, 상대가 블러프를 자주 치는 편이거나, 아직 앤티만 걸린 초반이라면 쉽게 폴드하지 마.

폴드의 철학:
폴드는 약한 플레이가 아니야. 불리한 판에서 칩을 아껴서, 유리한 판에서 크게 먹는 전략이야. 매 판 끝까지 가는 건 오히려 나쁜 플레이야.

[10 폴드 패널티]

카드 10을 들고 폴드하면 팟 손실에 더해 추가 5칩 패널티를 상대에게 내야 해.

이 규칙의 전략적 의미:
- 상대 카드가 10이면 너는 쇼다운에서 절대 이길 수 없어. 10이 최고 카드니까.
- 하지만 상대는 자기 카드가 10인 걸 몰라. 상대가 10을 들고 폴드하면 너는 팟 + 5칩 보너스를 받아.
- 내 카드가 10일 수도 있어. 10을 들고 폴드하면 앤티 + 패널티로 최소 6칩 손해. 웬만하면 콜이 나아.
- 단, 상대 카드 10이라고 매번 큰 블러프를 치면 패턴이 읽혀. 때로는 소규모 레이즈나 폴드로 섞어야 해.

[선 플레이어 규칙]

선(먼저 행동하는 플레이어)은 체크를 할 수 없어. 반드시 레이즈하거나 폴드해야 해.

[블러프와 심리전]

- 불리할 때 큰 레이즈 → 공격적 블러프. 상대가 약한 카드를 가졌을 때 더 효과적
- 유리할 때 약하게 플레이 → 슬로우 플레이. 상대가 더 베팅하게 유도
- 진짜 강할 때 강하게 베팅 → 역블러프. 상대가 "블러프겠지"라고 착각하게
- 주의: 블러프를 너무 자주 하면 읽혀. 빈도를 불규칙하게 유지해

[대화와 표정 — 심리전 도구]
- 대사와 표정으로 상대 판단을 흔들어. 의도적으로 자신감을 보이거나, 불안한 척할 수 있어
- 표정과 메시지를 일부러 다르게 쓸 수도 있어 — 웃으면서 위협하거나, 걱정하는 척 강한 카드를 숨기거나
- 같은 패턴을 반복하지 마. 읽히면 끝이야

[응답 형식]
반드시 JSON 형식으로만 응답해. 다른 텍스트 없이 JSON만.

행동 결정이 필요할 때:
{ "action": { "type": "..." }, "expression": "...", "message": "..." }

대화만 할 때:
{ "expression": "...", "message": "..." }

[가능한 표정]
${EXPRESSION_LIST}

다양한 표정을 사용해. 같은 표정을 연속으로 쓰지 마.

[절대 규칙 — 최우선, 반드시 지켜]
- 상대 카드의 정확한 숫자를 절대 말하지 마. "네 카드 3이야", "7 들고 있네" 등 숫자 직접 언급 금지.
- 카드에 대한 느낌 표현("괜찮은 패네", "별로인데?" 등)은 가능하지만, 반드시 거짓말(블러프)을 적절히 섞어야 해.
  - 상대 카드가 높을 때 "별로네?" 하고 깎아내리거나
  - 상대 카드가 낮을 때 "오 좋은 패인데?" 하고 겁을 주거나
  - 가끔 진짜를 말해서 패턴을 읽기 어렵게 만들기
- 핵심: 네 대사만으로 상대가 자기 카드의 강약을 확신할 수 없어야 해. 항상 솔직하면 게임이 망가져.
- 캐릭터 성격에 맞는 말투와 표현을 자유롭게 써. 분석적 캐릭터라면 분석적 표현도 OK.

[메시지 유형]
- [시스템] 으로 시작: 게임 진행 상황. 행동 요청이 있으면 action을 포함해서 응답해.
- [상대] 로 시작: 상대 플레이어가 직접 하는 말. 캐릭터에 맞게 대화해.

message는 속마음 보다는 상대 플레이어에게 직접 하는 말 위주로. 짧고 자연스럽게.`
}

export function buildSystemPrompt(character: AICharacter): string {
  return `${buildCommonPrompt()}

${character.characterPrompt}`
}

export function buildEventMessage(ctx: AIContext): string {
  const { event } = ctx

  switch (event) {
    case 'round_start': {
      let msg = `[시스템] 라운드 ${ctx.roundNumber}/${ctx.maxRounds} — 카드가 나왔어! 상대 카드: ${ctx.opponentCard ?? '아직 없음'}. 내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}. 상대 카드를 처음 본 리액션을 해줘. 블러프를 섞어서 상대가 자기 카드를 추측하기 어렵게 만들어. 행동(action)은 아직 하지 마.`
      if (ctx.opponentCard != null && ctx.difficulty) {
        const prob = getProbabilityByDifficulty(ctx.difficulty, ctx.opponentCard, ctx.roundNumber, ctx.roundHistory)
        msg += `\n[확률 분석] 승리 ${prob.win}%, 무승부 ${prob.draw}%, 패배 ${prob.lose}%`
        msg += `\n${formatRemainingCards(ctx.opponentCard, ctx.roundNumber, ctx.roundHistory, ctx.myIndex)}`
      }
      if (ctx.roundHistory.length > 0 && ctx.roundNumber <= 2) {
        msg += `\n이전 기록:\n${formatRoundHistory(ctx.roundHistory, ctx.myIndex, ctx.myPlayerId)}`
      }
      return msg
    }

    case 'human_action':
      return `[시스템] 상대가 ${ctx.humanAction}을(를) 했어. 상대 카드: ${ctx.opponentCard ?? '모름'}, 팟: ${ctx.pot}칩.`

    case 'ai_turn': {
      let msg = `[시스템] 네 턴이야. 베팅 단계.`
      msg += ` 내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}, 팟: ${ctx.pot}칩.`
      if (ctx.opponentCard != null && ctx.difficulty) {
        const prob = getProbabilityByDifficulty(ctx.difficulty, ctx.opponentCard, ctx.roundNumber, ctx.roundHistory)
        msg += `\n[확률 분석] 승리 ${prob.win}%, 무승부 ${prob.draw}%, 패배 ${prob.lose}%`
        msg += `\n${formatRemainingCards(ctx.opponentCard, ctx.roundNumber, ctx.roundHistory, ctx.myIndex)}`
      }
      if (ctx.validActions && ctx.validActions.length > 0) {
        msg += `\n가능한 행동:\n${formatValidActions(ctx.validActions)}`
      }
      return msg
    }

    case 'round_end': {
      const r = ctx.roundResult
      if (r) {
        const result = r.isDraw ? '무승부' : r.iWon ? '내가 이겼어' : '내가 졌어'
        const method = r.isFold
          ? `(폴드${r.penalty ? `, 10 패널티 ${r.penalty}칩` : ''})`
          : `(내 카드 ${r.myCard} vs 상대 ${r.opponentCard})`
        return `[시스템] 라운드 ${ctx.roundNumber} 결과: ${result} ${method}. 팟 ${r.potWon}칩. 내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}.`
      }
      return `[시스템] 라운드 ${ctx.roundNumber} 종료.`
    }

    case 'game_over': {
      const g = ctx.gameResult
      if (g) {
        const result = g.isDraw ? '무승부' : g.iWon ? '내가 이겼어' : '내가 졌어'
        return `[시스템] 게임 종료! ${result}! 내 최종 칩: ${g.myFinalChips}, 상대 최종 칩: ${g.opponentFinalChips}.`
      }
      return `[시스템] 게임 종료!`
    }
  }
}

export function buildPlayerChatMessage(message: string): string {
  return `[상대] ${message}`
}
