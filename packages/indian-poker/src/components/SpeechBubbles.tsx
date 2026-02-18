import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../store/gameStore'

interface Props {
  messages: ChatMessage[]
  sender: 'ai' | 'player'
  className?: string
}

/** 글자 길이에 따라 4~8초 */
function getDuration(msg: string): number {
  const len = msg.length
  if (len <= 10) return 4000
  if (len >= 100) return 8000
  return 4000 + ((len - 10) / 90) * 4000
}

interface VisibleMsg {
  index: number
  msg: ChatMessage
  fading: boolean
}

export default function SpeechBubbles({ messages, sender, className = '' }: Props) {
  const [visible, setVisible] = useState<VisibleMsg[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const filtered = messages
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => sender === 'ai' ? (m.sender === 'ai' || m.sender === 'opponent') : m.sender === 'player')

  const prevLenRef = useRef(0)

  // 새 메시지 도착 → visible에 추가만 (타이머는 아래 effect에서)
  useEffect(() => {
    if (filtered.length <= prevLenRef.current) {
      prevLenRef.current = filtered.length
      return
    }

    const newOnes = filtered.slice(prevLenRef.current)
    prevLenRef.current = filtered.length

    setVisible(prev => {
      const added = newOnes.map(({ m, i }) => ({ index: i, msg: m, fading: false }))
      return [...prev, ...added].slice(-3)
    })
  }, [filtered.length])

  // 가장 오래된(non-fading) 메시지가 바뀔 때만 사라짐 타이머 시작
  const oldestActive = visible.find(v => !v.fading)
  const oldestKey = oldestActive?.index ?? -1

  useEffect(() => {
    if (oldestKey < 0) return

    const target = visible.find(v => v.index === oldestKey)
    if (!target) return

    const duration = getDuration(target.msg.message)

    const fadeTimer = setTimeout(() => {
      setVisible(prev => prev.map(v => v.index === oldestKey ? { ...v, fading: true } : v))

      const removeTimer = setTimeout(() => {
        setVisible(prev => prev.filter(v => v.index !== oldestKey))
        timersRef.current.delete(oldestKey)
      }, 400)
      timersRef.current.set(oldestKey + 100000, removeTimer)
    }, duration)
    timersRef.current.set(oldestKey, fadeTimer)

    return () => {
      clearTimeout(fadeTimer)
      timersRef.current.delete(oldestKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oldestKey])

  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t)
    }
  }, [])

  const isAI = sender === 'ai'

  if (visible.length === 0) return null

  return (
    <div className={`flex flex-col ${className}`}>
      {visible.map((v, i) => (
        <div
          key={v.index}
          className={`overflow-hidden transition-all duration-300 ease-out ${
            v.fading ? '' : 'animate-bubble-in'
          }`}
          style={{
            animationDelay: v.fading ? undefined : `${i * 50}ms`,
            opacity: v.fading ? 0 : 1,
            maxHeight: v.fading ? 0 : '30rem',
            paddingBottom: v.fading ? 0 : 6,
          }}
        >
          <div
            className={`text-sm px-3 py-2 w-fit max-w-full break-words ${
              isAI
                ? 'bg-slate-700/90 text-white rounded-2xl rounded-tl-sm'
                : 'bg-poker-accent/25 text-white rounded-2xl rounded-br-none ml-auto'
            }`}
          >
            {v.msg.message}
          </div>
        </div>
      ))}
    </div>
  )
}
