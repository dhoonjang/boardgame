import { useEffect, useRef, useState } from 'react'

interface Props {
  message: string | null
}

export default function AIChatBubble({ message }: Props) {
  const [opacity, setOpacity] = useState(0)
  const [displayMsg, setDisplayMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 기존 타이머 리셋
    if (timerRef.current) clearTimeout(timerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)

    if (message && message.trim() !== '') {
      setDisplayMsg(message)
      setOpacity(1)

      // 8초 후 페이드아웃 시작
      timerRef.current = setTimeout(() => {
        setOpacity(0)
        // 페이드아웃 완료 후 숨김
        fadeTimerRef.current = setTimeout(() => {
          setDisplayMsg(null)
        }, 300)
      }, 8000)
    } else {
      // null이나 빈 문자열이면 페이드아웃
      setOpacity(0)
      fadeTimerRef.current = setTimeout(() => {
        setDisplayMsg(null)
      }, 300)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [message])

  if (!displayMsg) return null

  return (
    <div
      className="relative bg-slate-700 text-white text-sm px-3 py-2 rounded-lg max-w-48 transition-opacity duration-300"
      style={{ opacity }}
    >
      <div className="absolute -left-1.5 bottom-3 w-3 h-3 bg-slate-700 rotate-45" />
      <p className="relative z-10">{displayMsg}</p>
    </div>
  )
}
