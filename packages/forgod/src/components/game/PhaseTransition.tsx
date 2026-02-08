import { motion, AnimatePresence } from 'framer-motion'

interface PhaseTransitionProps {
  show: boolean
  text: string
  subText?: string
}

export default function PhaseTransition({ show, text, subText }: PhaseTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-parchment-texture border-wood-frame rounded-xl px-8 py-5 text-center"
          >
            <h2 className="font-serif font-bold text-2xl text-wood-dark text-ink-shadow">
              {text}
            </h2>
            {subText && (
              <p className="text-ink-faded mt-1 text-sm">{subText}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
