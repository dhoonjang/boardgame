import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { HeroClass } from '@forgod/core'
import { useGameStore } from '../store/gameStore'
import RetroButton from '../components/ui/RetroButton'
import RetroPanel from '../components/ui/RetroPanel'
import { CLASS_LABELS } from '../styles/theme'

interface PlayerSetup {
  name: string
  heroClass: HeroClass
}

const CLASSES: HeroClass[] = ['warrior', 'rogue', 'mage']

export default function NewGamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') || 'local'
  const { createGame, setAdapterMode, isLoading, error } = useGameStore()

  const [playerCount, setPlayerCount] = useState(3)
  const [players, setPlayers] = useState<PlayerSetup[]>(
    Array.from({ length: 6 }, (_, i) => ({
      name: `플레이어 ${i + 1}`,
      heroClass: CLASSES[i % 3],
    }))
  )

  const handleCreate = async () => {
    setAdapterMode(mode as 'local' | 'server')
    const gamePlayers = players.slice(0, playerCount).map((p, i) => ({
      id: `player-${i + 1}`,
      name: p.name,
      heroClass: p.heroClass,
    }))
    try {
      const gameId = await createGame(gamePlayers)
      navigate(`/game/${gameId}`)
    } catch {
      // error is set in store
    }
  }

  const updatePlayer = (index: number, updates: Partial<PlayerSetup>) => {
    setPlayers(prev => prev.map((p, i) => i === index ? { ...p, ...updates } : p))
  }

  return (
    <div className="h-screen bg-ink/95 flex items-center justify-center p-4">
      <RetroPanel className="max-w-lg w-full">
        <h2 className="font-serif font-bold text-xl text-wood-dark mb-4 text-center">
          새 게임 만들기
        </h2>

        {/* Player count */}
        <div className="mb-4">
          <label className="text-xs text-ink-faded block mb-1">인원 수</label>
          <div className="flex gap-2">
            {[3, 4, 5, 6].map(n => (
              <RetroButton
                key={n}
                variant={playerCount === n ? 'gold' : 'secondary'}
                size="sm"
                onClick={() => setPlayerCount(n)}
              >
                {n}명
              </RetroButton>
            ))}
          </div>
        </div>

        {/* Player setup */}
        <div className="space-y-2 mb-4">
          {players.slice(0, playerCount).map((player, i) => (
            <div key={i} className="flex items-center gap-2 bg-parchment-dark/20 p-2 rounded">
              <span className="text-xs text-ink-faded w-6">{i + 1}.</span>
              <input
                type="text"
                value={player.name}
                onChange={e => updatePlayer(i, { name: e.target.value })}
                className="flex-1 bg-parchment border border-wood/30 rounded px-2 py-1 text-sm text-ink font-serif focus:outline-none focus:border-gold"
              />
              <div className="flex gap-1">
                {CLASSES.map(cls => (
                  <button
                    key={cls}
                    onClick={() => updatePlayer(i, { heroClass: cls })}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                      player.heroClass === cls
                        ? cls === 'warrior' ? 'bg-warrior text-white'
                        : cls === 'rogue' ? 'bg-rogue text-white'
                        : 'bg-mage text-white'
                        : 'bg-parchment-dark/30 text-ink-faded hover:bg-parchment-dark/50'
                    }`}
                  >
                    {CLASS_LABELS[cls]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-3">{error}</p>
        )}

        <div className="flex gap-3 justify-center">
          <RetroButton variant="secondary" onClick={() => navigate('/')}>
            뒤로
          </RetroButton>
          <RetroButton variant="gold" size="lg" onClick={handleCreate} disabled={isLoading}>
            {isLoading ? '생성 중...' : '게임 시작'}
          </RetroButton>
        </div>
      </RetroPanel>
    </div>
  )
}
