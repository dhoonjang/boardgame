import type { RoundResult, ValidAction } from '../game'
import type { AIPersonality, AIReactionContext, AITurnContext } from './types'

function formatValidActions(actions: ValidAction[]): string {
  return actions.map(a => {
    if (a.type === 'RAISE' && a.minAmount != null && a.maxAmount != null) {
      return `- RAISE: 레이즈 (${a.minAmount}~${a.maxAmount}칩). JSON: { "type": "RAISE", "amount": 숫자 }`
    }
    if (a.type === 'CALL') return `- CALL: ${a.description}. JSON: { "type": "CALL" }`
    if (a.type === 'FOLD') return `- FOLD: 폴드. JSON: { "type": "FOLD" }`
    if (a.type === 'SWAP') return `- SWAP: ${a.description}. JSON: { "type": "SWAP" }`
    if (a.type === 'SKIP_ABILITY') return `- SKIP_ABILITY: 건너뛰기. JSON: { "type": "SKIP_ABILITY" }`
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

const EXPRESSION_LIST = 'poker_face, confident, nervous, smirking, surprised, thinking, taunting, laughing, angry, disappointed, pleased, shocked, cold, sweating, mocking'

function deceptionGuide(speechDeception: number): string {
  const liePercent = Math.round(speechDeception * 100)
  const truthPercent = 100 - liePercent
  return `- 약 ${liePercent}%는 속이기: 상대 카드가 높으면 낮은 척("그 카드론 힘들걸?"), 낮으면 높은 척("좀 치는데?")
- 약 ${truthPercent}%는 진실: 가끔 솔직한 반응도 해서 상대가 패턴을 읽기 어렵게 만들어`
}

function level(value: number): string {
  if (value <= 0.25) return '매우 낮음'
  if (value <= 0.45) return '낮음'
  if (value <= 0.6) return '보통'
  if (value <= 0.8) return '높음'
  return '매우 높음'
}

function buildPlayStyleGuide(p: AIPersonality): string {
  return `[플레이 성향]
- 공격성 ${level(p.aggressiveness)}: ${p.aggressiveness > 0.6 ? '큰 레이즈를 선호하고 적극적으로 베팅해' : p.aggressiveness < 0.4 ? '작은 베팅을 선호하고 신중하게 판단해' : '상황에 따라 공격과 수비를 조절해'}
- 블러프 빈도 ${level(p.bluffRate * 2)}: ${p.bluffRate > 0.3 ? '불리한 상황에서도 자주 블러프 레이즈를 해' : p.bluffRate < 0.2 ? '블러프를 거의 하지 않고 유리할 때만 베팅해' : '가끔씩 블러프를 섞어'}
- 표현력 ${level(p.expressiveness)}: ${p.expressiveness > 0.7 ? '표정을 크게 드러내며 다양한 감정을 보여줘' : p.expressiveness < 0.3 ? '표정 변화가 거의 없이 무덤덤하게 반응해' : '적당히 감정을 드러내'}
- 수다 ${level(p.chattiness)}: ${p.chattiness > 0.7 ? '거의 매번 말을 해. message를 null로 하지 마' : p.chattiness < 0.4 ? '말을 아끼고 중요한 순간에만 한마디 해. 가끔 message를 null로 해도 돼' : '적당히 말을 하되 매번은 아니야'}

[Swap 전략 핵심]
Swap은 내 카드를 새 카드로 교체하는 능력이야 (교체 후에도 내 카드는 못 봄).
상대방의 반응을 보고 내 카드를 교체할지 말지 고민하면 돼.`
}

export function buildAIPrompt(ctx: AITurnContext): { system: string; user: string } {
  const { personality } = ctx

  const system = `너는 인디언 포커 카드 게임에서 상대방과 마주앉아 플레이하는 AI 플레이어야.
성격: ${personality.name} — ${personality.description}

게임 규칙:
- 2인 게임, 카드 1~10 (높은 숫자가 승리)
- 상대 카드는 보이지만 자기 카드는 모름
- 능력 단계: Swap(카드 교체, 새 카드도 모름) 또는 Skip
- 베팅 단계: Raise(칩 추가), Call(맞추기), Fold(포기)
- 각 플레이어 20칩 시작, 한 명이 칩을 모두 잃으면 게임 종료

${buildPlayStyleGuide(personality)}

반드시 아래 JSON 형식으로만 응답해 (다른 텍스트 없이 JSON만):
{
  "action": { "type": "액션타입", ... },
  "expression": "표정",
  "message": "상대에게 하는 말 또는 null"
}

가능한 expression: ${EXPRESSION_LIST}
다양한 표정을 사용해. 같은 표정을 연속으로 쓰지 마.

[절대 규칙] message에서 상대 카드의 실제 숫자를 직접 말하거나 "높다/낮다"를 솔직하게 알려주면 안 돼.
너는 상대 카드를 볼 수 있지만, 상대는 자기 카드를 모르는 게임이야.

대사로 심리전을 해야 해:
${deceptionGuide(personality.speechDeception)}

message는 속마음 보다는 상대 플레이어에게 직접 하는 말 위주로.`

  const phaseLabel = ctx.phase === 'ability' ? '능력 선택' : '베팅'

  const user = `현재 상황:
- 라운드: ${ctx.roundNumber}/${ctx.maxRounds}
- 단계: ${phaseLabel}
- 상대 카드: ${ctx.opponentCard ?? '아직 없음'}
- 내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}, 팟: ${ctx.pot}
- 내 Swap 남은 횟수: ${ctx.mySwapCount}
- 덱 남은 카드: ${ctx.deckRemaining}장
- 이전 라운드 기록:
${formatRoundHistory(ctx.roundHistory, ctx.myIndex, ctx.myPlayerId)}

가능한 행동:
${formatValidActions(ctx.validActions)}

어떻게 하겠어?`

  return { system, user }
}

export function buildReactionPrompt(ctx: AIReactionContext): { system: string; user: string } {
  const { personality, event } = ctx

  const system = `너는 인디언 포커 카드 게임에서 상대방과 마주앉아 플레이하는 AI 플레이어야.
성격: ${personality.name} — ${personality.description}

지금은 행동을 결정하는 게 아니라, 상대 플레이어에게 말로 리액션하면 돼.

[리액션 성향]
- 표현력 ${level(personality.expressiveness)}: ${personality.expressiveness > 0.7 ? '표정을 크게 드러내며 다양한 감정을 보여줘' : personality.expressiveness < 0.3 ? '표정 변화가 거의 없이 무덤덤하게 반응해' : '적당히 감정을 드러내'}
- 수다 ${level(personality.chattiness)}: ${personality.chattiness > 0.7 ? '거의 매번 말을 해' : personality.chattiness < 0.4 ? '말을 아끼고 중요한 순간에만 한마디 해' : '적당히 말을 하되 매번은 아니야'}

반드시 아래 JSON 형식으로만 응답해 (다른 텍스트 없이 JSON만):
{
  "expression": "표정",
  "message": "상대에게 하는 말"
}

[절대 규칙] message에서 상대 카드의 실제 숫자를 직접 말하거나 "높다/낮다"를 솔직하게 알려주면 안 돼.

너는 상대 카드를 볼 수 있지만, 상대는 자기 카드를 모르는 게임이야.
대사로 심리전을 해야 해:
${deceptionGuide(personality.speechDeception)}

message는 속마음 보다는 상대 플레이어에게 직접 하는 말 위주로.

가능한 expression: ${EXPRESSION_LIST}`

  let situation = ''

  switch (event) {
    case 'round_start':
      situation = `새 라운드 ${ctx.roundNumber}/${ctx.maxRounds} 시작!
상대 카드: ${ctx.opponentCard ?? '아직 없음'}
내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}
상대 카드를 처음 봤어. 상대에게 한마디 해.`
      break

    case 'human_action':
      situation = `라운드 ${ctx.roundNumber}/${ctx.maxRounds}
상대가 "${ctx.humanAction}"을(를) 했어.
상대 카드: ${ctx.opponentCard ?? '모름'}, 팟: ${ctx.pot}칩
내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}
상대의 행동에 대해 상대에게 한마디 해.`
      break

    case 'round_end': {
      const r = ctx.roundResult
      if (r) {
        const result = r.isDraw ? '무승부' : r.iWon ? '내가 이겼어' : '내가 졌어'
        const method = r.isFold ? '(폴드)' : `(내 카드 ${r.myCard} vs 상대 ${r.opponentCard})`
        situation = `라운드 ${ctx.roundNumber} 결과: ${result} ${method}
팟 ${r.potWon}칩. 내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}
결과에 대해 상대에게 한마디 해.`
      }
      break
    }

    case 'game_over': {
      const g = ctx.gameResult
      if (g) {
        const result = g.isDraw ? '무승부' : g.iWon ? '내가 이겼어' : '내가 졌어'
        situation = `게임 종료! ${result}!
내 최종 칩: ${g.myFinalChips}, 상대 최종 칩: ${g.opponentFinalChips}
게임 끝난 소감을 상대에게 한마디 해.`
      }
      break
    }
  }

  const historyStr = ctx.roundHistory.length > 0
    ? `\n이전 라운드 기록:\n${formatRoundHistory(ctx.roundHistory, ctx.myIndex, ctx.myPlayerId)}`
    : ''

  const user = `${situation}${historyStr}`

  return { system, user }
}
