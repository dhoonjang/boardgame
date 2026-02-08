import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import RetroButton from '../components/ui/RetroButton'
import RetroPanel from '../components/ui/RetroPanel'

export default function JoinGamePage() {
  const navigate = useNavigate()
  const { loadGame, setAdapterMode, isLoading, error } = useGameStore()
  const [gameId, setGameId] = useState('')

  const handleJoin = async () => {
    if (!gameId.trim()) return
    setAdapterMode('server')
    await loadGame(gameId.trim())
    if (!useGameStore.getState().error) {
      navigate(`/game/${gameId.trim()}`)
    }
  }

  return (
    <div className="h-screen bg-ink/95 flex items-center justify-center p-4">
      <RetroPanel className="max-w-sm w-full">
        <h2 className="font-serif font-bold text-xl text-wood-dark mb-4 text-center">
          게임 참가
        </h2>

        <div className="mb-4">
          <label className="text-xs text-ink-faded block mb-1">게임 ID</label>
          <input
            type="text"
            value={gameId}
            onChange={e => setGameId(e.target.value)}
            placeholder="게임 코드를 입력하세요"
            className="w-full bg-parchment border border-wood/30 rounded px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:border-gold"
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-3">{error}</p>
        )}

        <div className="flex gap-3 justify-center">
          <RetroButton variant="secondary" onClick={() => navigate('/')}>
            뒤로
          </RetroButton>
          <RetroButton variant="gold" onClick={handleJoin} disabled={isLoading || !gameId.trim()}>
            {isLoading ? '접속 중...' : '참가'}
          </RetroButton>
        </div>
      </RetroPanel>
    </div>
  )
}
