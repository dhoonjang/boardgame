import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

export default function HomePage() {
  const navigate = useNavigate()
  const { connect, createGame, joinGame, gameId, isConnected, error, setError } = useGameStore()

  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')

  useEffect(() => {
    connect()
  }, [connect])

  // gameId가 설정되면 로비로 이동
  useEffect(() => {
    if (gameId) {
      navigate(`/lobby/${gameId}`)
    }
  }, [gameId, navigate])

  const handleCreate = () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      return
    }
    createGame(name.trim())
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
            <li>- 칩 20개로 시작, 5라운드</li>
            <li>- 엿보기/교체 능력 각 3회</li>
            <li>- 베팅으로 블러프를 걸어보세요!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
