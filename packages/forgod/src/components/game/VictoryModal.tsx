import { motion, AnimatePresence } from 'framer-motion'
import type { Player } from '@forgod/core'
import RetroButton from '../ui/RetroButton'
import Badge from '../ui/Badge'
import { CLASS_LABELS } from '../../styles/theme'

interface VictoryModalProps {
  show: boolean
  winner: Player | null
  victoryType: 'angel' | 'demon' | 'revelation' | null
  onClose: () => void
}

export default function VictoryModal({ show, winner, victoryType, onClose }: VictoryModalProps) {
  return (
    <AnimatePresence>
      {show && winner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.5, rotateZ: -10 }}
            animate={{ scale: 1, rotateZ: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="bg-parchment-texture border-gold-accent rounded-xl px-10 py-8 text-center max-w-md shadow-2xl"
          >
            <h2 className="font-serif font-bold text-3xl text-gold mb-4 text-ink-shadow">
              {victoryType === 'angel' ? '천사의 승리' : victoryType === 'demon' ? '마왕의 승리' : '승리'}
            </h2>

            <div className="mb-6">
              <Badge variant={winner.heroClass as 'warrior' | 'rogue' | 'mage'} size="md">
                {CLASS_LABELS[winner.heroClass]}
              </Badge>
              <p className="font-serif font-bold text-2xl text-ink mt-2">{winner.name}</p>
              <p className="text-ink-faded text-sm mt-1">
                {victoryType === 'angel' && `신앙 ${winner.faithScore}점`}
                {victoryType === 'demon' && `마왕 ${winner.devilScore}점`}
              </p>
            </div>

            <RetroButton variant="gold" size="lg" onClick={onClose}>
              확인
            </RetroButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
