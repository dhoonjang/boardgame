import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import OpponentArea from '../components/OpponentArea'
import MyArea from '../components/MyArea'
import PotDisplay from '../components/PotDisplay'
import BettingControls from '../components/BettingControls'
import AbilityButtons from '../components/AbilityButtons'
import RoundHistory from '../components/RoundHistory'
import GameOverModal from '../components/GameOverModal'

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
  const { playerView, validActions, sendAction, playerId, error, reset } = useGameStore()

  // playerView가 없으면 홈으로
  useEffect(() => {
    if (!playerId) {
      navigate('/')
    }
  }, [playerId, navigate])

  if (!playerView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">게임 로딩 중...</p>
      </div>
    )
  }

  const isMyTurn = playerView.currentPlayerIndex === playerView.myIndex
  const hasStartAction = validActions.some(a => a.type === 'START_ROUND')
  const hasAbilityActions = validActions.some(a => ['PEEK', 'SWAP', 'SKIP_ABILITY'].includes(a.type))
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
              R{playerView.roundNumber}/{playerView.maxRounds}
            </span>
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
        />

        {/* 팟 */}
        <PotDisplay pot={playerView.pot} />

        {/* 내 영역 */}
        <MyArea
          me={playerView.me}
          myCard={playerView.myCard}
          hasPeeked={playerView.me.hasPeeked}
        />

        {/* 액션 컨트롤 */}
        <div className="bg-duel-surface rounded-xl border border-duel-border p-4">
          {hasStartAction && (
            <button
              onClick={() => sendAction({ type: 'START_ROUND' })}
              className="w-full px-6 py-3 bg-duel-accent hover:bg-indigo-500 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              {playerView.roundNumber === 0 ? '게임 시작!' : '다음 라운드'}
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
        />
      </div>

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
