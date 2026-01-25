import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-holy-500 to-corrupt-500 bg-clip-text text-transparent">
            For God
          </h1>
          <p className="text-xl text-slate-300">
            신과 마왕 사이에서 운명을 선택하는 전략 보드게임
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <ClassCard
            name="전사"
            color="warrior"
            description="강력한 힘으로 적을 압도하는 근접 전투의 달인"
            stats={{ str: 3, dex: 1, int: 1 }}
          />
          <ClassCard
            name="도적"
            color="rogue"
            description="빠른 움직임과 은신으로 적의 허를 찌르는 암살자"
            stats={{ str: 1, dex: 3, int: 1 }}
          />
          <ClassCard
            name="법사"
            color="mage"
            description="강력한 마법으로 원거리에서 적을 섬멸하는 마법사"
            stats={{ str: 1, dex: 1, int: 3 }}
          />
        </div>

        <div className="text-center">
          <Link
            to="/game/new"
            className="inline-block px-8 py-4 text-xl font-semibold bg-gradient-to-r from-holy-600 to-corrupt-600 rounded-lg hover:from-holy-500 hover:to-corrupt-500 transition-all shadow-lg hover:shadow-xl"
          >
            게임 시작
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-holy-500/30">
            <h2 className="text-2xl font-bold text-holy-500 mb-4">신성의 길</h2>
            <p className="text-slate-300">
              천사의 계시를 수행하고 신전에 제물을 바쳐 신의 축복을 받으세요.
              타락한 자들을 처단하고 빛의 영웅이 되어 승리하세요.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-corrupt-500/30">
            <h2 className="text-2xl font-bold text-corrupt-500 mb-4">타락의 길</h2>
            <p className="text-slate-300">
              마왕의 유혹에 빠져 타락 주사위의 힘을 얻으세요.
              마검을 손에 넣고 신전에 입장하여 어둠의 승리를 쟁취하세요.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function ClassCard({
  name,
  color,
  description,
  stats,
}: {
  name: string
  color: 'warrior' | 'rogue' | 'mage'
  description: string
  stats: { str: number; dex: number; int: number }
}) {
  const colorClasses = {
    warrior: 'border-warrior-500 text-warrior-500',
    rogue: 'border-rogue-500 text-rogue-500',
    mage: 'border-mage-500 text-mage-500',
  }

  return (
    <div className={`bg-slate-800/50 rounded-lg p-6 border ${colorClasses[color].split(' ')[0]}`}>
      <h3 className={`text-2xl font-bold mb-2 ${colorClasses[color].split(' ')[1]}`}>
        {name}
      </h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      <div className="flex justify-between text-sm">
        <span className="text-warrior-500">힘 {stats.str}</span>
        <span className="text-rogue-500">민첩 {stats.dex}</span>
        <span className="text-mage-500">지능 {stats.int}</span>
      </div>
    </div>
  )
}
