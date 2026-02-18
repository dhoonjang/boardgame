/**
 * 나노바나나(Vertex AI Gemini)를 사용한 캐릭터 표정 이미지 생성 스크립트
 *
 * 사용법:
 *   npx tsx scripts/generate-character-images.ts --character elon-musk
 *   npx tsx scripts/generate-character-images.ts --character elon-musk --expressions poker_face,confident
 *   npx tsx scripts/generate-character-images.ts --character elon-musk --force
 *
 * 필요:
 *   - 레퍼런스 이미지: scripts/references/{character-id}.{png,jpg,jpeg,webp}
 *   - gcloud CLI 인증 (gcloud auth print-access-token)
 *   - 환경변수 (선택): VERTEX_PROJECT_ID, VERTEX_LOCATION
 *
 * 출력:
 *   - packages/indian-poker/public/characters/{character-id}/{expression}.png (20개)
 *   - packages/indian-poker/public/characters/{character-id}/avatar.png (poker_face 복사본)
 */

import { readFile, writeFile, access } from 'fs/promises'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// indian-poker-server/.env에서 환경변수 로드
async function loadEnv() {
  const envPath = join(__dirname, '..', 'packages', 'indian-poker-server', '.env')
  try {
    const content = await readFile(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      const value = trimmed.slice(eqIdx + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch { /* .env 없으면 무시 */ }
}

function getAccessToken(): string {
  // gcloud CLI에서 항상 fresh token 사용 (OAuth2 토큰은 ~1시간 만료)
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim()
  } catch {
    // gcloud 실패 시 .env fallback
    const envToken = process.env.GEMINI_API_KEY
    if (envToken?.startsWith('ya29.')) return envToken
    throw new Error('액세스 토큰을 가져올 수 없습니다. gcloud auth login을 먼저 실행해주세요.')
  }
}

function getProjectId(): string {
  if (process.env.VERTEX_PROJECT_ID) return process.env.VERTEX_PROJECT_ID
  if (process.env.VERTEXT_PROJECT_ID) return process.env.VERTEXT_PROJECT_ID
  try {
    return execSync('gcloud config get-value project', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    throw new Error('프로젝트 ID를 확인할 수 없습니다. VERTEX_PROJECT_ID 환경변수를 설정해주세요.')
  }
}

const EXPRESSIONS = [
  { id: 'poker_face', prompt: 'completely neutral poker face, no emotion whatsoever, blank stare' },
  { id: 'confident', prompt: 'confident knowing expression, slight raised eyebrow, self-assured half-smile' },
  { id: 'nervous', prompt: 'nervous anxious expression, slight biting lip, worried eyes' },
  { id: 'smirking', prompt: 'sly smirk, one corner of mouth raised, mischievous knowing look' },
  { id: 'surprised', prompt: 'genuinely surprised expression, raised eyebrows, slightly open mouth' },
  { id: 'thinking', prompt: 'deep in thought, slightly furrowed brow, looking to the side contemplatively' },
  { id: 'taunting', prompt: 'provocative taunting expression, chin slightly raised, daring smirk' },
  { id: 'laughing', prompt: 'laughing out loud, wide open mouth, eyes crinkled with joy' },
  { id: 'angry', prompt: 'visibly angry, furrowed brows, clenched jaw, intense glare' },
  { id: 'disappointed', prompt: 'disappointed deflated expression, drooping eyelids, slight frown' },
  { id: 'pleased', prompt: 'warmly pleased, gentle genuine smile, soft relaxed eyes' },
  { id: 'shocked', prompt: 'utterly shocked, wide eyes, dropped jaw, frozen in disbelief' },
  { id: 'cold', prompt: 'ice cold emotionless stare, narrowed eyes, intimidating blank face' },
  { id: 'sweating', prompt: 'sweating nervously, forced smile, visible stress and tension' },
  { id: 'mocking', prompt: 'mockingly winking, one eye closed, teasing superior grin' },
  { id: 'bewildered', prompt: 'completely bewildered and confused, tilted head, one eyebrow raised higher than the other' },
  { id: 'scheming', prompt: 'scheming devious expression, narrowed eyes with sinister smile, plotting something' },
  { id: 'relieved', prompt: 'deeply relieved, exhaling with closed eyes, tension leaving the face' },
  { id: 'devastated', prompt: 'devastated crushed expression, looking down, utter defeat and despair' },
  { id: 'respect', prompt: 'respectful acknowledging nod, slight appreciative smile, impressed eyes' },
] as const

const ROOT = join(__dirname, '..')
const REFERENCES_DIR = join(ROOT, 'scripts', 'references')
const OUTPUT_DIR = join(ROOT, 'packages', 'indian-poker', 'public', 'characters')

const GEMINI_MODEL = 'gemini-2.5-flash-image'

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function generateImage(
  accessToken: string,
  projectId: string,
  location: string,
  referenceImageBase64: string,
  mimeType: string,
  expressionPrompt: string,
): Promise<Buffer> {
  const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${GEMINI_MODEL}:generateContent`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a new square 1:1 aspect ratio image of this person with the following expression: ${expressionPrompt}. Keep the exact same person's face, hair, and clothing. COMPOSITION: Head must be perfectly centered horizontally in the frame. Centered symmetrical portrait composition. Square format (1:1). POSE: Seated calmly at a poker table, hands resting on the table or holding poker chips in a relaxed manner. Arms down, no raised hands, no gesturing. Calm composed body language like a professional poker player. FRAMING: Head-and-shoulders to upper-body shot, facing camera directly. Dark poker room background with green felt table and warm dramatic lighting. Photorealistic style.`,
            },
            {
              inlineData: {
                mimeType,
                data: referenceImageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vertex AI 에러: ${response.status} ${errorText.slice(0, 300)}`)
  }

  const result = await response.json() as {
    candidates: Array<{
      content: {
        parts: Array<{
          text?: string
          inlineData?: { mimeType: string; data: string }
        }>
      }
    }>
  }

  for (const candidate of result.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, 'base64')
      }
    }
  }

  throw new Error('API 응답에 이미지 데이터가 없습니다.')
}

async function fitToSquare(imageBuffer: Buffer): Promise<Buffer> {
  const tmpIn = join(ROOT, '.tmp-fit-in.png')
  const tmpOut = join(ROOT, '.tmp-fit-out.png')
  try {
    await writeFile(tmpIn, imageBuffer)
    execSync(`python3 -c "
from PIL import Image
img = Image.open('${tmpIn}').convert('RGBA')
# 투명 영역을 제외한 실제 인물 바운딩 박스로 트리밍
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
w, h = img.size
s = max(w, h)
# 약간의 여백 (2%)
pad = int(s * 0.02)
s += pad * 2
canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
canvas.paste(img, ((s - w) // 2, (s - h) // 2), img)
canvas.save('${tmpOut}')
"`, { timeout: 30_000 })
    return await readFile(tmpOut)
  } finally {
    try { const { unlinkSync } = await import('fs'); unlinkSync(tmpIn) } catch {}
    try { const { unlinkSync } = await import('fs'); unlinkSync(tmpOut) } catch {}
  }
}

async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const tmpIn = join(ROOT, '.tmp-rembg-in.png')
  const tmpOut = join(ROOT, '.tmp-rembg-out.png')
  try {
    await writeFile(tmpIn, imageBuffer)
    execSync(`python3 -c "
from rembg import remove
with open('${tmpIn}','rb') as f: d=f.read()
with open('${tmpOut}','wb') as f: f.write(remove(d))
"`, { timeout: 120_000, maxBuffer: 50 * 1024 * 1024 })
    const result = await readFile(tmpOut)
    return result
  } finally {
    // 임시 파일 정리
    try { const { unlinkSync } = await import('fs'); unlinkSync(tmpIn) } catch {}
    try { const { unlinkSync } = await import('fs'); unlinkSync(tmpOut) } catch {}
  }
}

function detectMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

async function main() {
  await loadEnv()

  const args = process.argv.slice(2)
  const charIdx = args.indexOf('--character')
  if (charIdx === -1 || !args[charIdx + 1]) {
    console.error('사용법: npx tsx scripts/generate-character-images.ts --character <character-id>')
    console.error('       npx tsx scripts/generate-character-images.ts --character <character-id> --expressions poker_face,confident')
    console.error('       npx tsx scripts/generate-character-images.ts --character <character-id> --force')
    process.exit(1)
  }

  const characterId = args[charIdx + 1]
  const projectId = getProjectId()
  const location = process.env.VERTEX_LOCATION ?? 'us-central1'
  const accessToken = getAccessToken()

  // 레퍼런스 이미지 찾기
  let referencePath = ''
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const candidate = join(REFERENCES_DIR, `${characterId}.${ext}`)
    if (await fileExists(candidate)) {
      referencePath = candidate
      break
    }
  }

  if (!referencePath) {
    console.error(`레퍼런스 이미지를 찾을 수 없습니다.`)
    console.error(`scripts/references/${characterId}.{png,jpg,webp} 파일을 준비해주세요.`)
    process.exit(1)
  }

  // 특정 표정만 생성하는 옵션
  const exprIdx = args.indexOf('--expressions')
  let targetExpressions = EXPRESSIONS
  if (exprIdx !== -1 && args[exprIdx + 1]) {
    const ids = args[exprIdx + 1].split(',')
    targetExpressions = EXPRESSIONS.filter(e => ids.includes(e.id)) as typeof EXPRESSIONS
    if (targetExpressions.length === 0) {
      console.error('유효한 표정 ID가 없습니다.')
      process.exit(1)
    }
  }

  const outputDir = join(OUTPUT_DIR, characterId)
  let referenceImage = await readFile(referencePath)
  let base64 = referenceImage.toString('base64')
  let mimeType = detectMimeType(referencePath)

  console.log(`캐릭터: ${characterId}`)
  console.log(`레퍼런스: ${referencePath} (${mimeType})`)
  console.log(`Vertex AI: ${projectId} / ${location}`)
  console.log(`모델: ${GEMINI_MODEL}`)
  console.log(`출력: ${outputDir}`)
  console.log(`생성할 표정: ${targetExpressions.length}개`)
  console.log('')

  // poker_face를 먼저 생성하고, 그 raw 이미지를 나머지 표정의 레퍼런스로 사용
  const generatedRefPath = join(REFERENCES_DIR, `${characterId}-generated.png`)
  const pokerFaceExpr = targetExpressions.find(e => e.id === 'poker_face')
  const restExpressions = targetExpressions.filter(e => e.id !== 'poker_face')

  let success = 0
  let fail = 0

  // 1단계: poker_face 생성 → raw 이미지를 새 레퍼런스로 저장
  if (pokerFaceExpr) {
    const outputPath = join(outputDir, 'poker_face.png')
    if (!args.includes('--force') && await fileExists(outputPath)) {
      console.log(`[건너뜀] poker_face.png (이미 존재)`)
      success++
    } else {
      try {
        console.log(`[1단계] poker_face 생성 (원본 레퍼런스 사용)`)
        console.log(`[생성 중] poker_face — "${pokerFaceExpr.prompt}"`)
        const rawImage = await generateImage(accessToken, projectId, location, base64, mimeType, pokerFaceExpr.prompt)
        // raw 이미지를 새 레퍼런스로 저장
        await writeFile(generatedRefPath, rawImage)
        console.log(`[레퍼런스 저장] ${generatedRefPath}`)
        console.log(`[누끼] poker_face 배경 제거 중...`)
        const noBgImage = await removeBackground(rawImage)
        console.log(`[정사각형] poker_face 1:1 패딩 중...`)
        const imageBuffer = await fitToSquare(noBgImage)
        await writeFile(outputPath, imageBuffer)
        console.log(`[완료] poker_face.png (${(imageBuffer.length / 1024).toFixed(0)} KB)`)
        success++
      } catch (err) {
        console.error(`[실패] poker_face: ${err}`)
        fail++
      }
      if (restExpressions.length > 0) await new Promise(r => setTimeout(r, 1000))
    }
  }

  // 생성된 레퍼런스가 있으면 교체
  if (await fileExists(generatedRefPath)) {
    console.log(`\n[2단계] 나머지 표정 생성 (poker_face 레퍼런스 사용)`)
    referenceImage = await readFile(generatedRefPath)
    base64 = referenceImage.toString('base64')
    mimeType = 'image/png'
    console.log(`레퍼런스 교체: ${generatedRefPath}\n`)
  }

  // 2단계: 나머지 표정 생성 (poker_face 기반)
  for (const expr of restExpressions) {
    const outputPath = join(outputDir, `${expr.id}.png`)

    if (!args.includes('--force') && await fileExists(outputPath)) {
      console.log(`[건너뜀] ${expr.id}.png (이미 존재)`)
      success++
      continue
    }

    try {
      console.log(`[생성 중] ${expr.id} — "${expr.prompt}"`)
      const rawImage = await generateImage(accessToken, projectId, location, base64, mimeType, expr.prompt)
      console.log(`[누끼] ${expr.id} 배경 제거 중...`)
      const noBgImage = await removeBackground(rawImage)
      console.log(`[정사각형] ${expr.id} 1:1 패딩 중...`)
      const imageBuffer = await fitToSquare(noBgImage)
      await writeFile(outputPath, imageBuffer)
      console.log(`[완료] ${expr.id}.png (${(imageBuffer.length / 1024).toFixed(0)} KB)`)
      success++
    } catch (err) {
      console.error(`[실패] ${expr.id}: ${err}`)
      fail++
    }

    // Rate limit 방지
    if (success + fail < targetExpressions.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log(`\n완료: 성공 ${success}개, 실패 ${fail}개`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
