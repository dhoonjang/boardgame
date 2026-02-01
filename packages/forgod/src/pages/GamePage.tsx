import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import HexBoard from '../components/HexBoard'
import { useGameStore } from '../store/gameStore'

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const {
    playerId,
    isLoading,
    error,
    roundNumber,
    currentPhase,
    currentPlayerId,
    players,
    monsters,
    board,
    validActions,
    loadGame,
    executeAction,
  } = useGameStore()

  useEffect(() => {
    if (gameId) {
      // 스토어에 playerId가 없으면 기본값 사용 (멀티플레이어 시 세션에서 가져와야 함)
      const effectivePlayerId = playerId || 'player-1'
      loadGame(gameId, effectivePlayerId)
    }
  }, [gameId, playerId, loadGame])

  if (isLoading && !players.length) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-xl text-red-500">오류: {error}</div>
        <Link to="/" className="text-blue-400 hover:text-blue-300">
          홈으로 돌아가기
        </Link>
      </div>
    )
  }

  const currentPlayer = players.find(p => p.id === currentPlayerId)

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="text-slate-400 hover:text-white">
            ← 나가기
          </Link>
          <h1 className="text-2xl font-bold">For God</h1>
          <div className="text-slate-400">
            라운드 {roundNumber} | {currentPhase === 'move' ? '이동' : currentPhase === 'action' ? '행동' : '몬스터'} 단계
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 보드 */}
          <div className="lg:col-span-2 bg-slate-800/50 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">게임 보드</h2>
            <div className="aspect-square bg-slate-900/50 rounded-lg overflow-hidden">
              {board.length > 0 ? (
                <HexBoard
                  tiles={board}
                  players={players}
                  monsters={monsters}
                  currentPlayerId={currentPlayerId}
                  showCoords
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  보드 로딩 중...
                </div>
              )}
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-4">
            {/* 현재 플레이어 정보 */}
            {currentPlayer && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-holy-500">현재 턴</h3>
                <PlayerCard player={currentPlayer} isCurrentTurn />
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">가능한 액션</h3>
              <div className="space-y-2">
                {validActions?.map((va, i) => (
                  <button
                    key={i}
                    onClick={() => executeAction(va.action)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-left text-sm disabled:opacity-50"
                  >
                    {va.description}
                  </button>
                ))}
                {(!validActions || validActions.length === 0) && (
                  <p className="text-slate-500 text-sm">가능한 액션이 없습니다.</p>
                )}
              </div>
            </div>

            {/* 모든 플레이어 */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">플레이어</h3>
              <div className="space-y-2">
                {players.map(p => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    isCurrentTurn={p.id === currentPlayerId}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function PlayerCard({
  player,
  isCurrentTurn,
}: {
  player: {
    id: string
    name: string
    heroClass: string
    state: string
    health: number
    maxHealth: number
    isDead: boolean
  }
  isCurrentTurn?: boolean
}) {
  const classColors = {
    warrior: 'text-warrior-500',
    rogue: 'text-rogue-500',
    mage: 'text-mage-500',
  }

  const classNames = {
    warrior: '전사',
    rogue: '도적',
    mage: '법사',
  }

  return (
    <div
      className={`p-3 rounded ${
        isCurrentTurn ? 'bg-slate-600/50 ring-1 ring-holy-500' : 'bg-slate-700/30'
      } ${player.isDead ? 'opacity-50' : ''}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <span className={classColors[player.heroClass as keyof typeof classColors]}>
            [{classNames[player.heroClass as keyof typeof classNames]}]
          </span>{' '}
          <span className="font-medium">{player.name}</span>
        </div>
        <div className={player.state === 'holy' ? 'text-holy-500' : 'text-corrupt-500'}>
          {player.state === 'holy' ? '신성' : '타락'}
        </div>
      </div>
      <div className="mt-1 text-sm text-slate-400">
        HP: {player.health}/{player.maxHealth}
        {player.isDead && <span className="text-red-500 ml-2">사망</span>}
      </div>
    </div>
  )
}
