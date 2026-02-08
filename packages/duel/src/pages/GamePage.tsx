import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RoundResult } from '@duel/server/game'
import { useGameStore } from '../store/gameStore'
import OpponentArea from '../components/OpponentArea'
import MyArea from '../components/MyArea'
import PotDisplay from '../components/PotDisplay'
import BettingControls from '../components/BettingControls'
import AbilityButtons from '../components/AbilityButtons'
import RoundHistory from '../components/RoundHistory'
import GameOverModal from '../components/GameOverModal'
import RoundResultPopup from '../components/RoundResultPopup'

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'waiting': return '대기 중'
    case 'ability': return '능력 단계'
    case 'betting': return '베팅 단계'
    case 'showdown': return '쇼다운'
    case 'round_end': return '라운드 종료'
    case 'game_over': return '게임 종료'
    default: return phase
  }
}

export default function GamePage() {
  const navigate = useNavigate()
  const { playerView, validActions, sendAction, playerId, error, reset, isAIGame, aiExpression, aiChatMessage } = useGameStore()

  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const prevHistoryLenRef = useRef<number>(-1)

  // playerView가 없으면 홈으로
  useEffect(() => {
    if (!playerId) {
      navigate('/')
    }
  }, [playerId, navigate])

  // 라운드 결과 팝업: roundHistory 길이 변화 감지
  useEffect(() => {
    if (!playerView) return
    const len = playerView.roundHistory.length
    if (prevHistoryLenRef.current === -1) {
      // 첫 로드 — 팝업 표시 안 함
      prevHistoryLenRef.current = len
      return
    }
    if (len > prevHistoryLenRef.current && playerView.phase !== 'game_over') {
      setRoundResult(playerView.roundHistory[len - 1])
    }
    prevHistoryLenRef.current = len
  }, [playerView?.roundHistory.length, playerView?.phase])

  if (!playerView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">게임 로딩 중...</p>
      </div>
    )
  }

  const isMyTurn = playerView.currentPlayerIndex === playerView.myIndex
  const hasStartAction = validActions.some(a => a.type === 'START_ROUND')
  const hasAbilityActions = validActions.some(a => ['SWAP', 'SKIP_ABILITY'].includes(a.type))
  const hasBettingActions = validActions.some(a => ['RAISE', 'CALL', 'FOLD'].includes(a.type))

  const handleGoHome = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <div className="max-w-lg w-full flex flex-col gap-4">

        {/* 헤더 */}
        <div className="flex items-center justify-between bg-duel-surface rounded-lg px-4 py-2 border border-duel-border">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              R{playerView.roundNumber}
            </span>
            {playerView.phase !== 'waiting' && playerView.phase !== 'game_over' && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                playerView.firstPlayerIndex === playerView.myIndex
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-600/30 text-slate-400'
              }`}>
                선: {playerView.firstPlayerIndex === playerView.myIndex ? '나' : '상대'}
              </span>
            )}
            <span className="text-sm font-semibold px-2 py-0.5 rounded bg-duel-accent/20 text-duel-accent">
              {getPhaseLabel(playerView.phase)}
            </span>
          </div>
          <div className="text-sm">
            {isMyTurn ? (
              <span className="text-emerald-400 font-semibold">내 차례</span>
            ) : (
              <span className="text-slate-400">상대 차례</span>
            )}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* 상대 영역 */}
        <OpponentArea
          opponent={playerView.opponent}
          opponentCard={playerView.opponentCard}
          isAIGame={isAIGame}
          aiExpression={aiExpression}
          aiChatMessage={aiChatMessage}
        />

        {/* 팟 */}
        <PotDisplay pot={playerView.pot} />

        {/* 내 영역 */}
        <MyArea
          me={playerView.me}
        />

        {/* 액션 컨트롤 */}
        <div className="bg-duel-surface rounded-xl border border-duel-border p-4">
          {hasStartAction && playerView.roundNumber === 0 && (
            <button
              onClick={() => sendAction({ type: 'START_ROUND' })}
              className="w-full px-6 py-3 bg-duel-accent hover:bg-indigo-500 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              게임 시작!
            </button>
          )}

          {hasAbilityActions && (
            <AbilityButtons
              validActions={validActions}
              onAction={sendAction}
            />
          )}

          {hasBettingActions && (
            <BettingControls
              validActions={validActions}
              onAction={sendAction}
            />
          )}

          {!isMyTurn && playerView.phase !== 'round_end' && playerView.phase !== 'game_over' && playerView.phase !== 'waiting' && (
            <p className="text-center text-slate-400">상대의 차례를 기다리는 중...</p>
          )}
        </div>

        {/* 라운드 기록 */}
        <RoundHistory
          history={playerView.roundHistory}
          myPlayerId={playerId!}
          myIndex={playerView.myIndex}
        />
      </div>

      {/* 라운드 결과 팝업 */}
      {roundResult && playerView.phase !== 'game_over' && (
        <RoundResultPopup
          result={roundResult}
          myIndex={playerView.myIndex}
          myName={playerView.me.name}
          opponentName={playerView.opponent.name}
          onDismiss={() => {
            setRoundResult(null)
            if (playerView.phase === 'round_end') {
              sendAction({ type: 'START_ROUND' })
            }
          }}
        />
      )}

      {/* 게임 종료 모달 */}
      {playerView.phase === 'game_over' && (
        <GameOverModal
          view={playerView}
          myPlayerId={playerId!}
          onGoHome={handleGoHome}
        />
      )}
    </div>
  )
}
