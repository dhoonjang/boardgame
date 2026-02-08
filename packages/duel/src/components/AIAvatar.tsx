import type { AIExpression } from '@duel/server/game'

interface Props {
  expression: AIExpression
}

function getEyes(expression: AIExpression): JSX.Element {
  switch (expression) {
    case 'confident':
      return (
        <>
          <ellipse cx="35" cy="40" rx="5" ry="4" fill="#1e293b" />
          <ellipse cx="65" cy="40" rx="5" ry="4" fill="#1e293b" />
          <line x1="28" y1="33" x2="42" y2="36" stroke="#1e293b" strokeWidth="2" />
          <line x1="58" y1="36" x2="72" y2="33" stroke="#1e293b" strokeWidth="2" />
        </>
      )
    case 'nervous':
      return (
        <>
          <ellipse cx="35" cy="40" rx="6" ry="7" fill="#1e293b" />
          <ellipse cx="65" cy="40" rx="6" ry="7" fill="#1e293b" />
          <circle cx="36" cy="39" r="2" fill="white" />
          <circle cx="66" cy="39" r="2" fill="white" />
        </>
      )
    case 'smirking':
      return (
        <>
          <ellipse cx="35" cy="40" rx="5" ry="3" fill="#1e293b" />
          <ellipse cx="65" cy="40" rx="5" ry="3" fill="#1e293b" />
          <line x1="58" y1="34" x2="72" y2="37" stroke="#1e293b" strokeWidth="2" />
        </>
      )
    case 'surprised':
      return (
        <>
          <circle cx="35" cy="40" r="7" fill="#1e293b" />
          <circle cx="65" cy="40" r="7" fill="#1e293b" />
          <circle cx="35" cy="40" r="3" fill="white" />
          <circle cx="65" cy="40" r="3" fill="white" />
        </>
      )
    case 'thinking':
      return (
        <>
          <ellipse cx="35" cy="40" rx="5" ry="5" fill="#1e293b" />
          <ellipse cx="65" cy="41" rx="5" ry="4" fill="#1e293b" />
          <line x1="28" y1="35" x2="42" y2="35" stroke="#1e293b" strokeWidth="2" />
        </>
      )
    case 'taunting':
      return (
        <>
          <path d="M29 40 Q35 34 41 40" fill="#1e293b" />
          <path d="M59 40 Q65 34 71 40" fill="#1e293b" />
        </>
      )
    case 'laughing':
      return (
        <>
          {/* 눈감긴 아치형 ^_^ */}
          <path d="M29 40 Q35 34 41 40" stroke="#1e293b" strokeWidth="2.5" fill="none" />
          <path d="M59 40 Q65 34 71 40" stroke="#1e293b" strokeWidth="2.5" fill="none" />
        </>
      )
    case 'angry':
      return (
        <>
          {/* V형 눈썹 + 날카로운 눈 */}
          <ellipse cx="35" cy="41" rx="5" ry="4" fill="#1e293b" />
          <ellipse cx="65" cy="41" rx="5" ry="4" fill="#1e293b" />
          <line x1="28" y1="35" x2="42" y2="32" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="58" y1="32" x2="72" y2="35" stroke="#1e293b" strokeWidth="2.5" />
        </>
      )
    case 'disappointed':
      return (
        <>
          {/* 축 처진 반감긴 눈 */}
          <ellipse cx="35" cy="42" rx="5" ry="3" fill="#1e293b" />
          <ellipse cx="65" cy="42" rx="5" ry="3" fill="#1e293b" />
          <line x1="28" y1="37" x2="42" y2="39" stroke="#1e293b" strokeWidth="2" />
          <line x1="58" y1="39" x2="72" y2="37" stroke="#1e293b" strokeWidth="2" />
        </>
      )
    case 'pleased':
      return (
        <>
          {/* 부드러운 반달눈 */}
          <path d="M29 41 Q35 36 41 41" stroke="#1e293b" strokeWidth="2.5" fill="none" />
          <path d="M59 41 Q65 36 71 41" stroke="#1e293b" strokeWidth="2.5" fill="none" />
        </>
      )
    case 'shocked':
      return (
        <>
          {/* 초대형 동그란 눈 + 축소 동공 */}
          <circle cx="35" cy="40" r="9" fill="white" stroke="#1e293b" strokeWidth="2" />
          <circle cx="65" cy="40" r="9" fill="white" stroke="#1e293b" strokeWidth="2" />
          <circle cx="35" cy="40" r="3" fill="#1e293b" />
          <circle cx="65" cy="40" r="3" fill="#1e293b" />
        </>
      )
    case 'cold':
      return (
        <>
          {/* 가느다란 실눈 */}
          <line x1="29" y1="40" x2="41" y2="40" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="59" y1="40" x2="71" y2="40" stroke="#1e293b" strokeWidth="2.5" />
        </>
      )
    case 'sweating':
      return (
        <>
          {/* nervous보다 큰 눈 + 하이라이트 */}
          <ellipse cx="35" cy="40" rx="7" ry="8" fill="#1e293b" />
          <ellipse cx="65" cy="40" rx="7" ry="8" fill="#1e293b" />
          <circle cx="37" cy="38" r="2.5" fill="white" />
          <circle cx="67" cy="38" r="2.5" fill="white" />
        </>
      )
    case 'mocking':
      return (
        <>
          {/* 한쪽 눈 감긴 윙크 */}
          <path d="M29 40 Q35 34 41 40" stroke="#1e293b" strokeWidth="2.5" fill="none" />
          <ellipse cx="65" cy="40" rx="5" ry="4" fill="#1e293b" />
          <circle cx="66" cy="39" r="1.5" fill="white" />
        </>
      )
    default: // poker_face
      return (
        <>
          <ellipse cx="35" cy="40" rx="4" ry="5" fill="#1e293b" />
          <ellipse cx="65" cy="40" rx="4" ry="5" fill="#1e293b" />
        </>
      )
  }
}

function getMouth(expression: AIExpression): JSX.Element {
  switch (expression) {
    case 'confident':
      return <path d="M38 60 Q50 68 62 60" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    case 'nervous':
      return <path d="M38 63 Q44 58 50 63 Q56 58 62 63" stroke="#1e293b" strokeWidth="2" fill="none" />
    case 'smirking':
      return <path d="M38 60 Q50 62 62 56" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    case 'surprised':
      return <ellipse cx="50" cy="63" rx="6" ry="8" fill="#1e293b" />
    case 'thinking':
      return <path d="M40 62 Q50 60 60 62" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    case 'taunting':
      return (
        <>
          <path d="M36 58 Q50 72 64 58" stroke="#1e293b" strokeWidth="2.5" fill="#1e293b" />
          <rect x="40" y="58" width="20" height="4" fill="white" rx="1" />
        </>
      )
    case 'laughing':
      return (
        <>
          {/* 크게 벌린 입 + 이빨 */}
          <path d="M34 56 Q50 74 66 56" stroke="#1e293b" strokeWidth="2" fill="#1e293b" />
          <rect x="40" y="56" width="20" height="5" fill="white" rx="1" />
        </>
      )
    case 'angry':
      return (
        <>
          {/* 꽉 다문 이빨 */}
          <rect x="38" y="59" width="24" height="8" rx="2" fill="#1e293b" />
          <line x1="38" y1="63" x2="62" y2="63" stroke="white" strokeWidth="1.5" />
        </>
      )
    case 'disappointed':
      return <path d="M38 66 Q50 58 62 66" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    case 'pleased':
      return <path d="M38 60 Q50 67 62 60" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    case 'shocked':
      return <ellipse cx="50" cy="64" rx="8" ry="10" fill="#1e293b" />
    case 'cold':
      return <line x1="40" y1="62" x2="60" y2="62" stroke="#1e293b" strokeWidth="2" />
    case 'sweating':
      return <path d="M38 63 Q42 58 46 63 Q50 58 54 63 Q58 58 62 63" stroke="#1e293b" strokeWidth="2" fill="none" />
    case 'mocking':
      return <path d="M38 60 Q50 56 62 62" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    default: // poker_face
      return <line x1="40" y1="62" x2="60" y2="62" stroke="#1e293b" strokeWidth="2.5" />
  }
}

function getExtras(expression: AIExpression): JSX.Element | null {
  switch (expression) {
    case 'nervous':
      return (
        <>
          <circle cx="78" cy="35" r="3" fill="#60a5fa" opacity="0.6" />
          <circle cx="82" cy="42" r="2" fill="#60a5fa" opacity="0.4" />
        </>
      )
    case 'thinking':
      return (
        <>
          <circle cx="78" cy="24" r="4" fill="#94a3b8" opacity="0.5" />
          <circle cx="84" cy="16" r="3" fill="#94a3b8" opacity="0.4" />
          <circle cx="88" cy="10" r="2" fill="#94a3b8" opacity="0.3" />
        </>
      )
    case 'laughing':
      return (
        <>
          {/* 웃음 눈물방울 */}
          <path d="M22 42 Q24 48 22 50" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0.6" />
          <circle cx="22" cy="51" r="1.5" fill="#60a5fa" opacity="0.6" />
        </>
      )
    case 'angry':
      return (
        <>
          {/* 관자놀이 핏줄 + 붉은 기운 */}
          <path d="M18 28 L22 32 L18 32 L22 36" stroke="#ef4444" strokeWidth="1.5" fill="none" />
          <ellipse cx="50" cy="45" rx="35" ry="30" fill="#ef4444" opacity="0.08" />
        </>
      )
    case 'disappointed':
      return (
        <>
          {/* 한숨 구름 */}
          <text x="78" y="55" fill="#94a3b8" fontSize="10" opacity="0.6">...</text>
        </>
      )
    case 'pleased':
      return (
        <>
          {/* 반짝임 */}
          <text x="76" y="30" fill="#fbbf24" fontSize="10" opacity="0.7">&#10022;</text>
          <text x="18" y="28" fill="#fbbf24" fontSize="8" opacity="0.5">&#10022;</text>
        </>
      )
    case 'shocked':
      return (
        <>
          {/* 느낌표 */}
          <text x="46" y="22" fill="#ef4444" fontSize="14" fontWeight="bold">!</text>
        </>
      )
    case 'cold':
      return (
        <>
          {/* 얼음 결정 */}
          <text x="78" y="30" fill="#93c5fd" fontSize="10" opacity="0.7">&#10052;</text>
          <text x="16" y="50" fill="#93c5fd" fontSize="8" opacity="0.5">&#10052;</text>
        </>
      )
    case 'sweating':
      return (
        <>
          {/* 큰 땀방울 3~4개 */}
          <circle cx="78" cy="32" r="3.5" fill="#60a5fa" opacity="0.6" />
          <circle cx="82" cy="42" r="3" fill="#60a5fa" opacity="0.5" />
          <circle cx="20" cy="50" r="2.5" fill="#60a5fa" opacity="0.4" />
          <circle cx="76" cy="52" r="2" fill="#60a5fa" opacity="0.35" />
        </>
      )
    case 'mocking':
      return (
        <>
          {/* "ㅋ" 텍스트 파티클 */}
          <text x="76" y="28" fill="#94a3b8" fontSize="8" opacity="0.7">ㅋ</text>
          <text x="82" y="36" fill="#94a3b8" fontSize="6" opacity="0.5">ㅋ</text>
          <text x="80" y="22" fill="#94a3b8" fontSize="7" opacity="0.6">ㅋ</text>
        </>
      )
    default:
      return null
  }
}

export default function AIAvatar({ expression }: Props) {
  return (
    <div className="relative transition-all duration-300">
      <svg viewBox="0 0 100 80" className="w-20 h-16">
        {/* 얼굴 */}
        <ellipse cx="50" cy="45" rx="35" ry="30" fill="#fbbf24" />
        {/* 눈 */}
        {getEyes(expression)}
        {/* 입 */}
        {getMouth(expression)}
        {/* 부가요소 */}
        {getExtras(expression)}
      </svg>
    </div>
  )
}
