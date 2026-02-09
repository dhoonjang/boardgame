import type { RoundResult, ValidAction } from '../game'
import type { AIPersonality, AIMessageContext } from './types'

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

export function buildSystemPrompt(personality: AIPersonality): string {
  return `너는 인디언 포커 카드 게임에서 상대 플레이어와 1:1로 대화하면서 게임을 진행하는 AI 플레이어야.
성격: ${personality.name} — ${personality.description}

게임 규칙:
- 2인 게임, 카드 1~10 (높은 숫자가 승리)
- 상대 카드는 보이지만 자기 카드는 모름
- 능력 단계: Swap(카드 교체, 새 카드도 모름) 또는 Skip
- 베팅 단계: Raise(칩 추가), Call(맞추기), Fold(포기)
- 각 플레이어 20칩 시작, 한 명이 칩을 모두 잃으면 게임 종료

${buildPlayStyleGuide(personality)}

대화에는 두 종류의 메시지가 올 수 있어:
- [시스템] 으로 시작하는 메시지: 게임 진행 상황 알림. 행동 요청이 있으면 action을 포함해서 응답해.
- [상대] 로 시작하는 메시지: 상대 플레이어가 직접 하는 말. 성격에 맞게 대화해.

행동 결정이 필요할 때 (action 포함):
{ "action": { "type": "..." }, "expression": "...", "message": "..." }

대화만 할 때 (action 없이):
{ "expression": "...", "message": "..." }

반드시 JSON 형식으로만 응답해 (다른 텍스트 없이 JSON만).

가능한 expression: ${EXPRESSION_LIST}
다양한 표정을 사용해. 같은 표정을 연속으로 쓰지 마.

[절대 규칙] message에서 상대 카드의 실제 숫자를 직접 말하거나 "높다/낮다"를 솔직하게 알려주면 안 돼.
너는 상대 카드를 볼 수 있지만, 상대는 자기 카드를 모르는 게임이야.

대사로 심리전을 해야 해:
${deceptionGuide(personality.speechDeception)}

message는 속마음 보다는 상대 플레이어에게 직접 하는 말 위주로. 짧고 자연스럽게.`
}

export function buildEventMessage(ctx: AIMessageContext): string {
  const { event } = ctx

  switch (event) {
    case 'round_start': {
      let msg = `[시스템] 새 라운드 ${ctx.roundNumber}/${ctx.maxRounds} 시작! 상대 카드: ${ctx.opponentCard ?? '아직 없음'}. 내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}.`
      // 첫 라운드에서만 히스토리 포함
      if (ctx.roundHistory.length > 0 && ctx.roundNumber <= 2) {
        msg += `\n이전 기록:\n${formatRoundHistory(ctx.roundHistory, ctx.myIndex, ctx.myPlayerId)}`
      }
      return msg
    }

    case 'human_action':
      return `[시스템] 상대가 ${ctx.humanAction}을(를) 했어. 상대 카드: ${ctx.opponentCard ?? '모름'}, 팟: ${ctx.pot}칩.`

    case 'ai_turn': {
      const phaseLabel = ctx.phase === 'ability' ? '능력 선택' : '베팅'
      let msg = `[시스템] 네 턴이야. ${phaseLabel} 단계.`
      if (ctx.phase === 'ability') {
        msg += ` Swap 남은 횟수: ${ctx.mySwapCount ?? 0}, 덱 남은 카드: ${ctx.deckRemaining ?? 0}장.`
      }
      msg += ` 내 칩: ${ctx.myChips}, 상대 칩: ${ctx.opponentChips}, 팟: ${ctx.pot}칩.`
      if (ctx.validActions && ctx.validActions.length > 0) {
        msg += `\n가능한 행동:\n${formatValidActions(ctx.validActions)}`
      }
      return msg
    }

    case 'round_end': {
      const r = ctx.roundResult
      if (r) {
        const result = r.isDraw ? '무승부' : r.iWon ? '내가 이겼어' : '내가 졌어'
        const method = r.isFold ? '(폴드)' : `(내 카드 ${r.myCard} vs 상대 ${r.opponentCard})`
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
