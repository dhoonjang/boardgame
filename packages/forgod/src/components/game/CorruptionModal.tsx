import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import RetroButton from '../ui/RetroButton'

interface CorruptionModalProps {
  show: boolean
}

export default function CorruptionModal({ show }: CorruptionModalProps) {
  const { executeAction } = useGameStore()

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="bg-parchment-texture border-wood-frame rounded-xl px-8 py-6 text-center max-w-sm"
          >
            <h2 className="font-serif font-bold text-xl text-corrupt mb-3">
              타락의 유혹
            </h2>
            <p className="text-ink-light text-sm mb-6">
              타락한 용사를 처치했습니다. 타락을 받아들이시겠습니까?
            </p>
            <div className="flex gap-4 justify-center">
              <RetroButton
                variant="primary"
                onClick={() => executeAction({ type: 'CHOOSE_CORRUPTION', accept: false })}
              >
                거부 (신성 유지)
              </RetroButton>
              <RetroButton
                variant="danger"
                onClick={() => executeAction({ type: 'CHOOSE_CORRUPTION', accept: true })}
              >
                수락 (타락)
              </RetroButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
