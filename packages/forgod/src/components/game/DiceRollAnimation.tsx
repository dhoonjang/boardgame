import { motion, AnimatePresence } from 'framer-motion'
import DiceDisplay from '../ui/DiceDisplay'

interface DiceRollAnimationProps {
  show: boolean
  values: number[]
  label?: string
  subtitle?: string
}

export default function DiceRollAnimation({ show, values, label, subtitle }: DiceRollAnimationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <div className="bg-ink/80 rounded-xl px-6 py-4 shadow-2xl border border-gold/30">
            {label && (
              <div className="text-parchment/70 text-xs text-center mb-2 font-serif">{label}</div>
            )}
            <div className="flex gap-2 justify-center">
              {values.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ rotateX: 0, rotateY: 0 }}
                  animate={{
                    rotateX: [0, 180, 360, 540, 720],
                    rotateY: [0, 90, 180, 270, 360],
                  }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                >
                  <DiceDisplay value={v} size="lg" />
                </motion.div>
              ))}
            </div>
            <div className="text-gold font-mono font-bold text-xl text-center mt-2">
              {values.reduce((a, b) => a + b, 0)}
            </div>
            {subtitle && (
              <div className="text-parchment/60 text-xs text-center mt-1 font-serif">{subtitle}</div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
