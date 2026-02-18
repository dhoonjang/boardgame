export default function PotDisplay({ pot }: { pot: number }) {
  if (pot <= 0) return null

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="text-sm text-slate-400">팟</span>
      <div className="flex items-center gap-2 bg-duel-surface px-4 py-2 rounded-lg border border-duel-border">
        <div className="w-6 h-6 rounded-full bg-duel-gold border-2 border-yellow-600" />
        <span className="text-2xl font-bold text-duel-gold">{pot}</span>
      </div>
    </div>
  )
}
