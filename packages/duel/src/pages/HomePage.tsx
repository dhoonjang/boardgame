import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { AI_PERSONALITIES } from '@duel/server/game'

export default function HomePage() {
  const navigate = useNavigate()
  const { connect, createGame, createAIGame, joinGame, gameId, isConnected, error, setError, isAIGame, opponentName } = useGameStore()

  const [name, setName] = useState(() => localStorage.getItem('duel-player-name') ?? '')
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'ai'>('menu')
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null)

  useEffect(() => {
    connect()
  }, [connect])

  // gameId가 설정되면 로비로 이동 (AI 게임은 바로 게임 페이지로)
  useEffect(() => {
    if (gameId && isAIGame && opponentName) {
      navigate(`/game/${gameId}`)
    } else if (gameId && !isAIGame) {
      navigate(`/lobby/${gameId}`)
    }
  }, [gameId, isAIGame, opponentName, navigate])

  const saveName = (n: string) => {
    localStorage.setItem('duel-player-name', n)
  }

  const handleCreate = () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    saveName(name.trim())
    createGame(name.trim())
  }

  const handleAIGame = () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    saveName(name.trim())
    createAIGame(name.trim(), selectedPersonality ?? undefined)
  }

  const handleJoin = () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    if (!joinCode.trim()) {
      setError('게임 코드를 입력해주세요.')
      return
    }
    saveName(name.trim())
    joinGame(joinCode.trim().toUpperCase(), name.trim())
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-white mb-2">Bluff Duel</h1>
          <p className="text-slate-400">인디언 포커 스타일 2인 블러프 카드 게임</p>
        </div>

        {/* 연결 상태 */}
        <div className="flex justify-center mb-6">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {isConnected ? '서버 연결됨' : '연결 중...'}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg mb-4 text-center text-sm">
            {error}
          </div>
        )}

        {mode === 'menu' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode('ai')}
              disabled={!isConnected}
              className="w-full px-6 py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white font-semibold rounded-xl text-lg transition-colors"
            >
              AI 대전
            </button>
            <button
              onClick={() => setMode('create')}
              disabled={!isConnected}
              className="w-full px-6 py-4 bg-duel-accent hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold rounded-xl text-lg transition-colors"
            >
              방 만들기
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={!isConnected}
              className="w-full px-6 py-4 bg-duel-surface hover:bg-slate-600 disabled:bg-slate-700 text-white font-semibold rounded-xl text-lg transition-colors border border-duel-border"
            >
              방 참가하기
            </button>
          </div>
        )}

        {mode === 'ai' && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="이름 입력"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={10}
              className="w-full px-4 py-3 bg-duel-surface border border-duel-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              autoFocus
            />

            {/* 페르소나 선택 */}
            <div className="mt-1">
              <p className="text-sm text-slate-400 mb-2">AI 상대 선택</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedPersonality(null)}
                  className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                    selectedPersonality === null
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-duel-border bg-duel-surface text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold text-sm">랜덤</div>
                  <div className="text-xs mt-0.5 opacity-70">무작위 AI 상대</div>
                </button>
                {AI_PERSONALITIES.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPersonality(p.name)}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                      selectedPersonality === p.name
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-duel-border bg-duel-surface text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs mt-0.5 opacity-70">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAIGame}
              disabled={!isConnected}
              className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
            >
              AI와 대결 시작
            </button>
            <button
              onClick={() => setMode('menu')}
              className="text-slate-400 hover:text-white text-sm"
            >
              뒤로가기
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="이름 입력"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={10}
              className="w-full px-4 py-3 bg-duel-surface border border-duel-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-duel-accent"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!isConnected}
              className="w-full px-6 py-3 bg-duel-accent hover:bg-indigo-500 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
            >
              게임 만들기
            </button>
            <button
              onClick={() => setMode('menu')}
              className="text-slate-400 hover:text-white text-sm"
            >
              뒤로가기
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="이름 입력"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={10}
              className="w-full px-4 py-3 bg-duel-surface border border-duel-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-duel-accent"
              autoFocus
            />
            <input
              type="text"
              placeholder="게임 코드 (4자리)"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full px-4 py-3 bg-duel-surface border border-duel-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-duel-accent text-center text-2xl tracking-widest font-mono"
            />
            <button
              onClick={handleJoin}
              disabled={!isConnected}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
            >
              참가하기
            </button>
            <button
              onClick={() => setMode('menu')}
              className="text-slate-400 hover:text-white text-sm"
            >
              뒤로가기
            </button>
          </div>
        )}

        {/* 게임 규칙 요약 */}
        <div className="mt-8 bg-duel-surface rounded-xl border border-duel-border p-4">
          <h3 className="font-semibold text-white mb-2">게임 규칙</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>- 상대 카드는 보이고, 내 카드는 안 보임</li>
            <li>- 카드: 1~10 (높은 숫자가 승리)</li>
            <li>- 칩 20개로 시작, 상대 칩을 모두 뺏으면 승리</li>
            <li>- 교체 능력 3회</li>
            <li>- 베팅으로 블러프를 걸어보세요!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
