import { useState } from 'react'

interface Props {
  onSend: (message: string) => void
  placeholder?: string
}

export default function ChatInput({ onSend, placeholder = '말을 걸어보세요...' }: Props) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex gap-2 px-4 py-2">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-slate-800 text-white text-sm px-4 py-2 rounded-full border border-slate-600 focus:outline-none focus:border-poker-accent transition-colors"
      />
      <button
        onClick={handleSend}
        disabled={!input.trim()}
        className="px-4 py-2 bg-poker-accent text-white text-sm rounded-full hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        전송
      </button>
    </div>
  )
}
