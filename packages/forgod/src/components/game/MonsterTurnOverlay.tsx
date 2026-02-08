import { motion, AnimatePresence } from 'framer-motion'
import type { Monster } from '@forgod/core'
import DiceDisplay from '../ui/DiceDisplay'

interface MonsterTurnOverlayProps {
  show: boolean
  monsters: Monster[]
  monsterDice: number[]
}

export default function MonsterTurnOverlay({ show, monsters, monsterDice }: MonsterTurnOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-ink/90 border border-gold/30 rounded-xl px-6 py-4 shadow-lg"
        >
          <h3 className="font-serif font-bold text-gold text-center text-lg mb-3">
            몬스터 턴
          </h3>
          {/* Dice */}
          <div className="flex justify-center gap-1.5 mb-3">
            {monsterDice.map((d, i) => (
              <DiceDisplay key={i} value={d} size="md" variant="default" />
            ))}
          </div>
          {/* Monster actions */}
          <div className="space-y-1.5">
            {monsters.filter(m => !m.isDead).map(monster => {
              const sum = monster.diceIndices.reduce((acc, idx) => acc + (monsterDice[idx] || 0), 0)
              return (
                <div key={monster.id} className="flex items-center gap-2 text-sm text-parchment">
                  <span className="font-serif font-semibold">{monster.name}</span>
                  <span className="text-[10px] text-parchment/50 font-mono">
                    [{monster.diceIndices.map(i => monsterDice[i]).join('+')}]
                  </span>
                  <span className="text-gold font-mono font-bold">{sum}</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
