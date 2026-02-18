import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

export default function LobbyPage() {
  const { id: gameId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { playerView, opponentName, error } = useGameStore()

  // 상대가 입장하면 자동으로 게임 페이지로 이동
  useEffect(() => {
    if (opponentName && gameId) {
      navigate(`/game/${gameId}`)
    }
  }, [opponentName, gameId, navigate])

  // playerView에서 상대가 이미 있으면 바로 게임으로
  useEffect(() => {
    if (playerView && playerView.opponent.id && gameId) {
      navigate(`/game/${gameId}`)
    }
  }, [playerView, gameId, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-6">상대 대기 중...</h2>

        {/* 게임 코드 표시 */}
        <div className="bg-poker-surface border border-poker-border rounded-2xl p-8 mb-6">
          <p className="text-sm text-slate-400 mb-3">게임 코드를 상대에게 공유하세요</p>
          <div className="text-5xl font-extrabold text-poker-accent tracking-[0.3em] font-mono">
            {gameId}
          </div>
        </div>

        {/* 로딩 애니메이션 */}
        <div className="flex justify-center gap-1 mb-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-poker-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white text-sm"
        >
          취소하고 홈으로
        </button>
      </div>
    </div>
  )
}
