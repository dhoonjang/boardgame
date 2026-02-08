import { Link } from 'react-router-dom'
import RetroButton from '../components/ui/RetroButton'
import RetroPanel from '../components/ui/RetroPanel'

export default function HomePage() {
  return (
    <div className="h-screen bg-ink/95 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-serif text-5xl font-bold text-gold text-ink-shadow mb-2">
            For God
          </h1>
          <p className="font-serif text-lg text-parchment/70 italic">
            신과 마왕 사이에서 운명을 선택하라
          </p>
        </div>

        {/* Mode selection */}
        <RetroPanel className="text-center">
          <div className="space-y-4 py-2">
            <p className="text-ink-faded text-sm">플레이 모드를 선택하세요</p>
            <div className="flex gap-4 justify-center">
              <Link to="/game/new?mode=local">
                <RetroButton variant="gold" size="lg">
                  로컬 플레이
                </RetroButton>
              </Link>
              <Link to="/game/new?mode=server">
                <RetroButton variant="primary" size="lg">
                  서버 플레이
                </RetroButton>
              </Link>
            </div>
          </div>
        </RetroPanel>

        {/* Classes */}
        <div className="grid grid-cols-3 gap-3">
          <RetroPanel variant="compact">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-warrior/20 mx-auto flex items-center justify-center mb-1">
                <span className="text-warrior font-bold text-lg">W</span>
              </div>
              <h3 className="font-serif font-bold text-warrior text-sm">전사</h3>
              <p className="text-[10px] text-ink-faded mt-0.5">힘에 특화된 근접 전투 전문가</p>
            </div>
          </RetroPanel>
          <RetroPanel variant="compact">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-rogue/20 mx-auto flex items-center justify-center mb-1">
                <span className="text-rogue font-bold text-lg">R</span>
              </div>
              <h3 className="font-serif font-bold text-rogue text-sm">도적</h3>
              <p className="text-[10px] text-ink-faded mt-0.5">민첩성을 활용한 기습 전문가</p>
            </div>
          </RetroPanel>
          <RetroPanel variant="compact">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-mage/20 mx-auto flex items-center justify-center mb-1">
                <span className="text-mage font-bold text-lg">M</span>
              </div>
              <h3 className="font-serif font-bold text-mage text-sm">법사</h3>
              <p className="text-[10px] text-ink-faded mt-0.5">지능을 사용하는 원거리 마법사</p>
            </div>
          </RetroPanel>
        </div>

        {/* Victory conditions */}
        <div className="grid grid-cols-2 gap-3">
          <RetroPanel variant="compact">
            <h4 className="font-serif font-bold text-holy text-xs mb-1">신성의 길</h4>
            <p className="text-[10px] text-ink-faded">
              천사의 계시를 수행하고 신앙 점수를 쌓아 마왕을 처단하라
            </p>
          </RetroPanel>
          <RetroPanel variant="compact">
            <h4 className="font-serif font-bold text-corrupt text-xs mb-1">타락의 길</h4>
            <p className="text-[10px] text-ink-faded">
              마왕의 계시를 수행하고 마검을 뽑아 세계를 타락시켜라
            </p>
          </RetroPanel>
        </div>

        {/* Join game (server mode) */}
        <div className="text-center">
          <Link to="/game/join" className="text-parchment/50 hover:text-parchment/80 text-xs underline">
            기존 게임에 참가
          </Link>
        </div>
      </div>
    </div>
  )
}
