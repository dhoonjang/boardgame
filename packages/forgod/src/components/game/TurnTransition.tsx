import { motion, AnimatePresence } from 'framer-motion'
import type { Player } from '@forgod/core'
import RetroButton from '../ui/RetroButton'
import Badge from '../ui/Badge'
import { CLASS_LABELS } from '../../styles/theme'

interface TurnTransitionProps {
  show: boolean
  player: Player | null
  onReady: () => void
}

export default function TurnTransition({ show, player, onReady }: TurnTransitionProps) {
  return (
    <AnimatePresence>
      {show && player && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            className="bg-parchment-texture border-wood-frame rounded-xl px-10 py-8 text-center max-w-sm"
          >
            <h2 className="font-serif font-bold text-xl text-wood-dark mb-2">
              다음 차례
            </h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant={player.heroClass as 'warrior' | 'rogue' | 'mage'} size="md">
                {CLASS_LABELS[player.heroClass]}
              </Badge>
              <span className="font-serif font-bold text-2xl text-ink">
                {player.name}
              </span>
            </div>
            <p className="text-ink-faded text-sm mb-6">
              기기를 다음 플레이어에게 전달하세요
            </p>
            <RetroButton variant="gold" size="lg" onClick={onReady}>
              준비 완료
            </RetroButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
