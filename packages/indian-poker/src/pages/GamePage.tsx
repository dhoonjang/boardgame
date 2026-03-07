import type { RoundResult } from '@indian-poker/server/game'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BettingControls from '../components/BettingControls'
import ChatInput from '../components/ChatInput'
import GameInfoBar from '../components/GameInfoBar'
import GameOverModal from '../components/GameOverModal'
import MyArea from '../components/MyArea'
import OpponentArea from '../components/OpponentArea'
import RoundHistory from '../components/RoundHistory'
import RoundResultPopup from '../components/RoundResultPopup'
import SpeechBubbles from '../components/SpeechBubbles'
import { useGameStore } from '../store/gameStore'

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'waiting': return '대기 중'
    case 'betting': return '베팅 단계'
    case 'showdown': return '쇼다운'
    case 'round_end': return '라운드 종료'
    case 'game_over': return '게임 종료'
    default: return phase
  }
}

export default function GamePage() {
  const navigate = useNavigate()
  const {
    playerView, validActions, sendAction, playerId, error, reset,
    isAIGame, aiExpression, aiCharacterId,
    chatMessages, sendChat, pendingRoundResult, pendingGameOver, flushDeferredState,
  } = useGameStore()

  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showGameOverModal, setShowGameOverModal] = useState(false)
  const prevHistoryLenRef = useRef<number>(-1)
  const shownRoundResultRef = useRef<number>(0)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameOverFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // playerView가 없으면 홈으로
  useEffect(() => {
    if (!playerId) {
      navigate('/')
    }
  }, [playerId, navigate])

  // show-game-over 이벤트 기반 모달 표시
  useEffect(() => {
    if (!pendingGameOver) return

    const appliedView = playerView?.phase === 'game_over'
      ? playerView
      : flushDeferredState()
    if (appliedView?.phase !== 'game_over') return

    setShowGameOverModal(true)
    useGameStore.setState({ pendingGameOver: false })
    if (gameOverFallbackRef.current) {
      clearTimeout(gameOverFallbackRef.current)
      gameOverFallbackRef.current = null
    }
  }, [pendingGameOver, playerView?.phase, flushDeferredState])

  // Fallback: AI 게임에서 10초 내 show-game-over 미도착 시
  useEffect(() => {
    if (playerView?.phase !== 'game_over') return
    if (showGameOverModal) return
    if (!isAIGame) {
      // PvP는 즉시 표시 (show-game-over가 이미 왔어야 하지만 안전장치)
      setShowGameOverModal(true)
      return
    }
    gameOverFallbackRef.current = setTimeout(() => {
      setShowGameOverModal(true)
    }, 10000)
    return () => {
      if (gameOverFallbackRef.current) {
        clearTimeout(gameOverFallbackRef.current)
        gameOverFallbackRef.current = null
      }
    }
  }, [playerView?.phase, isAIGame, showGameOverModal])

  // show-round-result 이벤트 기반 모달 표시
  useEffect(() => {
    if (!playerView || !pendingRoundResult || playerView.phase === 'game_over') return
    if (pendingRoundResult.roundNumber <= shownRoundResultRef.current) {
      useGameStore.setState({ pendingRoundResult: null })
      return
    }
    setRoundResult(pendingRoundResult)
    shownRoundResultRef.current = pendingRoundResult.roundNumber
    useGameStore.setState({ pendingRoundResult: null })
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
  }, [pendingRoundResult, playerView?.phase])

  // Fallback: AI 게임에서 10초 내 show-round-result 미도착 시
  useEffect(() => {
    if (!playerView || !isAIGame) return
    const len = playerView.roundHistory.length
    if (prevHistoryLenRef.current === -1) {
      prevHistoryLenRef.current = len
      return
    }
    if (len > prevHistoryLenRef.current && playerView.phase === 'round_end') {
      const lastRound = playerView.roundHistory[len - 1]
      if (!lastRound || lastRound.roundNumber <= shownRoundResultRef.current) {
        prevHistoryLenRef.current = len
        return
      }
      fallbackTimerRef.current = setTimeout(() => {
        if (!roundResult) {
          const latest = useGameStore.getState().playerView
          const latestLastRound = latest?.roundHistory[latest.roundHistory.length - 1]
          if (
            latestLastRound &&
            latestLastRound.roundNumber > shownRoundResultRef.current &&
            latest?.phase === 'round_end'
          ) {
            shownRoundResultRef.current = latestLastRound.roundNumber
            setRoundResult(latestLastRound)
          }
        }
      }, 10000)
    }
    prevHistoryLenRef.current = len
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
    }
  }, [playerView?.roundHistory.length, playerView?.phase, isAIGame])

  if (!playerView) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-slate-400">게임 로딩 중...</p>
      </div>
    )
  }

  const isMyTurn = playerView.currentPlayerIndex === playerView.myIndex
  const hasStartAction = validActions.some(a => a.type === 'START_ROUND')
  const hasBettingActions = validActions.some(a => ['RAISE', 'CALL', 'FOLD'].includes(a.type))

  const handleGoHome = () => {
    reset()
    navigate('/')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden max-w-2xl mx-auto">
      {/* ─── HEADER ─── */}
      <div className="shrink-0 flex items-center justify-between bg-poker-surface px-4 py-2 border-b border-poker-border">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">R{playerView.roundNumber}</span>
          <span className="text-sm font-semibold px-2 py-0.5 rounded bg-poker-accent/20 text-poker-accent">
            {getPhaseLabel(playerView.phase)}
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
        </div>
        <div className="flex items-center gap-3">
          {playerView.phase !== 'waiting' && playerView.phase !== 'game_over' && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              playerView.isNewDeck
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-slate-600/30 text-slate-400'
            }`}>
              🃏{playerView.deckRemaining}
            </span>
          )}
          {isMyTurn ? (
            <span className="text-emerald-400 font-semibold text-sm">내 차례</span>
          ) : (
            <span className="text-slate-400 text-sm">상대 차례</span>
          )}
          {playerView.phase === 'game_over' && !showGameOverModal && (
            <button
              onClick={() => setShowGameOverModal(true)}
              className="text-xs px-2 py-1 rounded bg-poker-accent/20 hover:bg-poker-accent/30 text-poker-accent transition-colors"
            >
              결과
            </button>
          )}
          {playerView.roundHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(v => !v)}
              className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              기록
            </button>
          )}
        </div>
      </div>

      {/* ─── 에러 메시지 ─── */}
      {error && (
        <div className="shrink-0 bg-red-500/20 border-b border-red-500/30 text-red-300 px-4 py-2 text-sm text-center">
          {error}
        </div>
      )}

      {/* ─── MAIN ─── */}
      <main className="flex-1 flex flex-col items-center justify-center overflow-hidden px-4">
        {/* 아바타 + 말풍선: 말풍선 고정 너비로 아바타 위치 고정 */}
        <div className="flex items-center">
          <div className="shrink-0">
            <OpponentArea
              opponent={playerView.opponent}
              opponentCard={playerView.opponentCard}
              isAIGame={isAIGame}
              aiExpression={aiExpression}
              aiCharacterId={aiCharacterId}
            />
          </div>

          {/* 말풍선 — 고정 너비라 내용 유무와 무관하게 아바타 위치 불변 */}
          <div className="w-32 sm:w-44 md:w-52 shrink-0 flex flex-col gap-2 self-center">
            <SpeechBubbles messages={chatMessages} sender="ai" />
            <SpeechBubbles messages={chatMessages} sender="player" />
          </div>
        </div>

        {/* 팟 + 베팅 */}
        <GameInfoBar className="mt-3"
          opponentBet={playerView.opponent.currentBet}
          myBet={playerView.me.currentBet}
          pot={playerView.pot}
        />
      </main>

      {/* ─── FOOTER ─── */}
      <div className="shrink-0">
        {/* MY INFO BAR */}
        <MyArea me={playerView.me} />

        {/* CONTROLS */}
        <div className="px-4 py-2 border-t border-poker-border/50 min-h-[5.5rem] flex flex-col items-center justify-center w-full">
          {hasStartAction && playerView.roundNumber === 0 && (
            <button
              onClick={() => sendAction({ type: 'START_ROUND' })}
              className="w-full px-6 py-3 bg-poker-accent hover:bg-amber-600 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              게임 시작!
            </button>
          )}

          {hasBettingActions && (
            <BettingControls validActions={validActions} onAction={sendAction} />
          )}

          {playerView.phase === 'game_over' && !showGameOverModal && (
            <button
              onClick={handleGoHome}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-lg transition-colors"
            >
              홈으로
            </button>
          )}

          {!isMyTurn && playerView.phase !== 'round_end' && playerView.phase !== 'game_over' && playerView.phase !== 'waiting' && (
            <p className="text-center text-slate-400 text-sm py-2">상대의 차례를 기다리는 중...</p>
          )}
        </div>

        {/* CHAT INPUT */}
        <ChatInput onSend={sendChat} placeholder={isAIGame ? '말을 걸어보세요...' : '메시지 입력...'} />
      </div>

      {/* ─── RoundHistory Drawer ─── */}
      {showHistory && (
        <div className="absolute inset-0 z-40 flex flex-col">
          <div className="flex-1 bg-black/50" onClick={() => setShowHistory(false)} />
          <div className="bg-poker-surface border-t border-poker-border rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-end mb-3">
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                닫기
              </button>
            </div>
            <RoundHistory
              history={playerView.roundHistory}
              myPlayerId={playerId!}
              myIndex={playerView.myIndex}
            />
          </div>
        </div>
      )}

      {/* ─── RoundResultPopup ─── */}
      {roundResult && playerView.phase !== 'game_over' && (
        <RoundResultPopup
          result={roundResult}
          myIndex={playerView.myIndex}
          myName={playerView.me.name}
          opponentName={playerView.opponent.name}
          onDismiss={() => {
            setRoundResult(null)
            const appliedView = flushDeferredState()
            const phase = appliedView?.phase ?? playerView.phase
            if (phase === 'round_end') {
              sendAction({ type: 'START_ROUND' })
            }
          }}
        />
      )}

      {/* ─── GameOverModal ─── */}
      {playerView.phase === 'game_over' && showGameOverModal && (
        <GameOverModal
          view={playerView}
          myPlayerId={playerId!}
          onGoHome={handleGoHome}
          isAIGame={isAIGame}
          onContinueChat={() => setShowGameOverModal(false)}
        />
      )}
    </div>
  )
}
