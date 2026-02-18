export default function ChipStack({ amount, label }: { amount: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-poker-gold border-2 border-yellow-600" />
        <span className="text-xl font-bold text-poker-gold">{amount}</span>
      </div>
    </div>
  )
}
