import { GoogleGenAI, type Content, type Part } from '@google/genai'
import type { ApiAttachment, ApiMessage } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const SYSTEM_INSTRUCTION =
  '당신은 친절하고 정확한 AI 어시스턴트입니다. 사용자가 사용하는 언어로 답하고, ' +
  '필요할 때 마크다운(제목, 리스트, 표, 코드 블록)을 사용해 읽기 쉽게 정리하세요. ' +
  '코드 블록에는 항상 언어 이름을 표기하세요. 사용자가 이미지나 파일을 첨부하면 그 내용을 꼼꼼히 살펴보고 답하세요.'

const INLINE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'])

// 첨부 파일을 Gemini 입력 파트로 변환합니다. 텍스트 파일은 본문을 텍스트로 넣습니다.
function attachmentPart(a: ApiAttachment): Part | null {
  if (typeof a?.data !== 'string' || !a.data) return null
  const name = typeof a.name === 'string' ? a.name.slice(0, 200) : '파일'
  if (INLINE_MIME.has(a.mimeType)) return { inlineData: { mimeType: a.mimeType, data: a.data } }
  if (a.mimeType === 'text/plain') return { text: `[첨부 파일: ${name}]\n\`\`\`\n${a.data}\n\`\`\`` }
  return null
}

function toParts(m: ApiMessage): Part[] {
  const parts: Part[] = []
  if (Array.isArray(m.attachments)) {
    for (const a of m.attachments) {
      const part = attachmentPart(a)
      if (part) parts.push(part)
    }
  }
  if (typeof m.content === 'string' && m.content.trim()) parts.push({ text: m.content })
  return parts
}

// GOOGLE_GENERATIVE_AI_API_KEY가 있으면 Google API에 직접 연결합니다(로컬 / Vercel).
// 없으면 기본 생성자를 사용해 Netlify AI Gateway가 주입한 자격 증명을 자동으로 사용합니다.
function createClient() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (apiKey) {
    return new GoogleGenAI({
      apiKey,
      httpOptions: { baseUrl: 'https://generativelanguage.googleapis.com' },
    })
  }
  return new GoogleGenAI({})
}

export async function POST(req: Request) {
  let messages: ApiMessage[]
  try {
    const body = await req.json()
    messages = Array.isArray(body?.messages) ? body.messages : []
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const contents: Content[] = messages
    .slice(-40)
    .map((m): Content => ({ role: m?.role === 'model' ? 'model' : 'user', parts: toParts(m) }))
    .filter((c) => c.parts!.length > 0)

  if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
    return Response.json({ error: '메시지가 비어 있습니다.' }, { status: 400 })
  }

  try {
    const ai = createClient()
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    })

    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch (err) {
          console.error('Gemini stream error:', err)
          controller.enqueue(encoder.encode('\n\n> ⚠️ 응답을 생성하는 중 오류가 발생했습니다.'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('Gemini request error:', err)
    return Response.json(
      { error: 'Gemini API 호출에 실패했습니다. API 키와 모델 설정을 확인해 주세요.' },
      { status: 500 },
    )
  }
}
