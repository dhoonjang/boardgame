export default function HiddenCard({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const sizeClasses = size === 'lg'
    ? 'w-28 h-40 text-5xl'
    : 'w-16 h-24 text-2xl'

  return (
    <div className={`${sizeClasses} bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center font-extrabold text-slate-400 shadow-lg border-2 border-slate-500`}>
      ?
    </div>
  )
}
