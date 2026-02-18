import { useEffect, useRef, useState } from 'react'
import { useGameStore, type ChatMessage } from '../store/gameStore'

export default function ChatArea() {
  const { chatMessages, sendChat, opponentName } = useGameStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages.length])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    sendChat(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-duel-surface rounded-xl border border-duel-border flex flex-col sticky top-4" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* 헤더 */}
      <div className="px-3 py-2 border-b border-duel-border">
        <span className="text-sm font-semibold text-slate-300">채팅</span>
      </div>

      {/* 메시지 로그 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {chatMessages.length === 0 && (
          <p className="text-center text-slate-500 text-sm mt-4">
            {opponentName ?? 'AI'}에게 말을 걸어보세요
          </p>
        )}
        {chatMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} aiName={opponentName ?? 'AI'} />
        ))}
      </div>

      {/* 입력 */}
      <div className="border-t border-duel-border p-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력..."
          className="flex-1 bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-duel-accent"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="px-3 py-2 bg-duel-accent text-white text-sm rounded-lg hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          전송
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ msg, aiName }: { msg: ChatMessage; aiName: string }) {
  const isPlayer = msg.sender === 'player'

  return (
    <div className={`flex ${isPlayer ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[90%]">
        <div className={`text-xs mb-0.5 ${isPlayer ? 'text-right text-slate-400' : 'text-slate-400'}`}>
          {isPlayer ? '나' : aiName}
        </div>
        <div
          className={`text-sm px-3 py-2 rounded-lg ${
            isPlayer
              ? 'bg-duel-accent/30 text-white'
              : 'bg-slate-700 text-white'
          }`}
        >
          {msg.message}
        </div>
      </div>
    </div>
  )
}
