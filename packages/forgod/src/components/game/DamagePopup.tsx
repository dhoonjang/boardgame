import { motion, AnimatePresence } from 'framer-motion'

interface DamagePopupProps {
  damages: Array<{
    id: number
    x: number
    y: number
    value: number
    type: 'damage' | 'heal' | 'shield'
  }>
}

const typeColors = {
  damage: 'text-red-500',
  heal: 'text-green-500',
  shield: 'text-blue-400',
}

const typePrefix = {
  damage: '-',
  heal: '+',
  shield: '',
}

export default function DamagePopup({ damages }: DamagePopupProps) {
  return (
    <AnimatePresence>
      {damages.map(d => (
        <motion.div
          key={d.id}
          initial={{ x: d.x, y: d.y, opacity: 1, scale: 1 }}
          animate={{ y: d.y - 40, opacity: 0, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`fixed z-50 font-mono font-bold text-lg pointer-events-none ${typeColors[d.type]}`}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
        >
          {typePrefix[d.type]}{d.value}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
