import { useState, useCallback, useRef, useEffect } from 'react'

interface QueueItem {
  id: string
  duration: number
  data: unknown
}

export function useAnimationQueue() {
  const [current, setCurrent] = useState<QueueItem | null>(null)
  const queueRef = useRef<QueueItem[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setCurrent(null)
      return
    }
    const item = queueRef.current.shift()!
    setCurrent(item)
    timerRef.current = setTimeout(() => {
      processNext()
    }, item.duration)
  }, [])

  const enqueue = useCallback((item: QueueItem) => {
    queueRef.current.push(item)
    if (!current) {
      processNext()
    }
  }, [current, processNext])

  const clear = useCallback(() => {
    queueRef.current = []
    clearTimeout(timerRef.current)
    setCurrent(null)
  }, [])

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  return { current, enqueue, clear, isPlaying: current !== null }
}
