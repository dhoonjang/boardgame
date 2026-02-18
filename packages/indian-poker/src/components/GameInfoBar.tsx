interface Props {
  opponentBet: number
  myBet: number
  pot: number
  className?: string
}

export default function GameInfoBar({
  opponentBet, myBet, pot, className = '',
}: Props) {
  const showBets = opponentBet > 0 || myBet > 0

  return (
    <div className={`w-full px-4 ${className}`}>
      {/* 팟 (중앙, 강조) */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Pot</span>
        <span className="text-xl font-bold text-poker-gold">{pot}</span>
      </div>

      {/* 베팅 비교 */}
      {showBets && (
        <div className="flex items-center justify-center gap-3 mt-1 text-xs text-slate-400">
          <span>베팅: <span className="text-white font-semibold">{opponentBet}</span></span>
          <span className="text-slate-600">vs</span>
          <span>베팅: <span className="text-white font-semibold">{myBet}</span></span>
        </div>
      )}
    </div>
  )
}
