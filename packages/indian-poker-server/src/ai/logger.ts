import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGS_DIR = path.resolve(__dirname, '../../logs')

function ts(): string {
  return new Date().toLocaleTimeString('ko-KR', { hour12: false })
}

function actionStr(action: unknown): string {
  if (!action || typeof action !== 'object') return '없음'
  const a = action as Record<string, unknown>
  if (a.type === 'RAISE') return `RAISE(${a.amount})`
  return String(a.type)
}

export class GameLogger {
  private stream: fs.WriteStream
  private startTime: Date

  constructor(gameId: string, characterId: string, characterName: string, difficulty: string) {
    fs.mkdirSync(LOGS_DIR, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `${timestamp}_${gameId}_${characterId}.md`
    this.stream = fs.createWriteStream(path.join(LOGS_DIR, filename))
    this.startTime = new Date()

    this.write(`# AI Game Log\n\n`)
    this.write(`| 항목 | 값 |\n|------|----|\n`)
    this.write(`| Game ID | ${gameId} |\n`)
    this.write(`| Character | ${characterName} (${characterId}) |\n`)
    this.write(`| Difficulty | ${difficulty} |\n`)
    this.write(`| Started | ${this.startTime.toLocaleString('ko-KR')} |\n\n`)
  }

  /** 시스템 프롬프트 기록 */
  logSystemPrompt(prompt: string): void {
    this.write(`---\n\n## 📋 System Prompt\n\n`)
    this.write(`<details>\n<summary>시스템 프롬프트 (접기/펼치기)</summary>\n\n`)
    this.write(`\`\`\`\n${prompt}\n\`\`\`\n\n</details>\n\n`)
  }

  /** API 호출 기록 (user message + raw response text + parsed result) */
  logChat(userMessage: string, rawResponse: string | null, parsed: object | null, error?: string): void {
    this.write(`---\n\n## [${ts()}] 📨 Chat\n\n`)
    this.write(`**User Message:**\n> ${userMessage.replace(/\n/g, '\n> ')}\n\n`)

    if (error) {
      this.write(`**Error:** ${error}\n\n`)
      return
    }

    if (rawResponse) {
      this.write(`**AI Raw Response:**\n\`\`\`\n${rawResponse}\n\`\`\`\n\n`)
    } else {
      this.write(`**AI Raw Response:** null (API 실패 또는 SDK 없음)\n\n`)
    }

    if (parsed) {
      const p = parsed as Record<string, unknown>
      const parts = [`expression=${p.expression ?? '?'}`]
      if (p.message) parts.push(`message="${p.message}"`)
      parts.push(`action=${actionStr(p.action)}`)
      this.write(`**Parsed:** ${parts.join(', ')}\n\n`)
    }
  }

  /** Fallback 결정 기록 */
  logFallback(event: string, decision: object): void {
    const d = decision as Record<string, unknown>
    this.write(`---\n\n## [${ts()}] 🔄 Fallback (${event})\n\n`)
    this.write(`expression=${d.expression}, message="${d.message ?? ''}", action=${actionStr(d.action)}\n\n`)
  }

  /** 액션 검증 기록 */
  logValidation(original: object, validated: object): void {
    const o = actionStr((original as Record<string, unknown>).action)
    const v = actionStr((validated as Record<string, unknown>).action)
    const same = o === v ? '✅' : '⚠️ 변경됨'
    this.write(`---\n\n## [${ts()}] 🔍 Validation\n\n`)
    this.write(`Original: ${o} → Validated: ${v} ${same}\n\n`)
  }

  /** 즉각 표정 반응 기록 */
  logInstantReaction(opponentCard: number, expression: string): void {
    this.write(`---\n\n## [${ts()}] ⚡ Instant Reaction\n\n`)
    this.write(`상대 카드: ${opponentCard} → 표정: ${expression}\n\n`)
  }

  /** 게임 종료 */
  close(): void {
    const elapsed = Math.round((Date.now() - this.startTime.getTime()) / 1000)
    const min = Math.floor(elapsed / 60)
    const sec = elapsed % 60
    this.write(`---\n\n## 🏁 Game End\n\n`)
    this.write(`게임 시간: ${min}분 ${sec}초\n`)
    this.stream.end()
  }

  private write(text: string): void {
    this.stream.write(text)
  }
}
