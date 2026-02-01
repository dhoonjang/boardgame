import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { HeroClass } from '@forgod/core'
import { useGameStore } from '../store/gameStore'

export default function NewGamePage() {
  const navigate = useNavigate()
  const { createGame, isLoading, error } = useGameStore()
  const [playerCount, setPlayerCount] = useState(2)
  const [selectedClasses, setSelectedClasses] = useState<(HeroClass | null)[]>([null, null])
  const [playerNames, setPlayerNames] = useState<string[]>(['플레이어 1', '플레이어 2'])

  const handleClassSelect = (playerIndex: number, heroClass: HeroClass) => {
    const newClasses = [...selectedClasses]
    newClasses[playerIndex] = heroClass
    setSelectedClasses(newClasses)
  }

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count)
    setSelectedClasses(Array(count).fill(null))
    setPlayerNames(Array.from({ length: count }, (_, i) => `플레이어 ${i + 1}`))
  }

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames]
    newNames[index] = name
    setPlayerNames(newNames)
  }

  const canStartGame = selectedClasses.every((c) => c !== null) && !isLoading

  const handleStartGame = async () => {
    if (!canStartGame) return

    const players = selectedClasses.map((heroClass, i) => ({
      id: `player-${i + 1}`,
      name: playerNames[i] || `플레이어 ${i + 1}`,
      heroClass: heroClass as HeroClass,
    }))

    // 첫 번째 플레이어를 현재 사용자로 설정
    const myPlayerId = 'player-1'
    await createGame(players, myPlayerId)
    const { gameId } = useGameStore.getState()
    if (gameId) {
      navigate(`/game/${gameId}`)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="text-slate-400 hover:text-white mb-8 inline-block"
        >
          &larr; 뒤로 가기
        </Link>

        <h1 className="text-4xl font-bold mb-8">새 게임</h1>

        <div className="bg-slate-800/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">플레이어 수</h2>
          <div className="flex gap-4">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => handlePlayerCountChange(count)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  playerCount === count
                    ? 'bg-holy-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {count}명
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-8 text-red-200">
            오류: {error}
          </div>
        )}

        <div className="space-y-6 mb-8">
          {Array.from({ length: playerCount }, (_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold">플레이어 {i + 1}</h2>
                <input
                  type="text"
                  value={playerNames[i] || ''}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  placeholder={`플레이어 ${i + 1} 이름`}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <ClassButton
                  name="전사"
                  heroClass="warrior"
                  selected={selectedClasses[i] === 'warrior'}
                  disabled={selectedClasses.some((c, idx) => idx !== i && c === 'warrior')}
                  onClick={() => handleClassSelect(i, 'warrior')}
                />
                <ClassButton
                  name="도적"
                  heroClass="rogue"
                  selected={selectedClasses[i] === 'rogue'}
                  disabled={selectedClasses.some((c, idx) => idx !== i && c === 'rogue')}
                  onClick={() => handleClassSelect(i, 'rogue')}
                />
                <ClassButton
                  name="법사"
                  heroClass="mage"
                  selected={selectedClasses[i] === 'mage'}
                  disabled={selectedClasses.some((c, idx) => idx !== i && c === 'mage')}
                  onClick={() => handleClassSelect(i, 'mage')}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleStartGame}
          disabled={!canStartGame}
          className={`w-full py-4 rounded-lg font-semibold text-xl transition-all ${
            canStartGame
              ? 'bg-gradient-to-r from-holy-600 to-corrupt-600 hover:from-holy-500 hover:to-corrupt-500'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? '생성 중...' : '게임 시작'}
        </button>
      </div>
    </main>
  )
}

function ClassButton({
  name,
  heroClass,
  selected,
  disabled,
  onClick,
}: {
  name: string
  heroClass: HeroClass
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  const colorClasses = {
    warrior: {
      selected: 'bg-warrior-600 border-warrior-500',
      default: 'border-warrior-500/50 hover:border-warrior-500',
    },
    rogue: {
      selected: 'bg-rogue-600 border-rogue-500',
      default: 'border-rogue-500/50 hover:border-rogue-500',
    },
    mage: {
      selected: 'bg-mage-600 border-mage-500',
      default: 'border-mage-500/50 hover:border-mage-500',
    },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled && !selected}
      className={`p-4 rounded-lg border-2 font-semibold transition-all ${
        selected
          ? colorClasses[heroClass].selected
          : disabled
            ? 'border-slate-700 text-slate-600 cursor-not-allowed'
            : `bg-slate-800 ${colorClasses[heroClass].default}`
      }`}
    >
      {name}
    </button>
  )
}
