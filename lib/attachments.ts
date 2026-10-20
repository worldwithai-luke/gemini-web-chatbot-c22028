import type { Attachment, AttachmentKind } from './types'
import { createId } from './storage'

// 첨부 파일 데이터는 localStorage(약 5MB) 대신 IndexedDB에 저장합니다.
// 대화 기록과 마찬가지로 브라우저 안에만 보관되며 서버에는 저장되지 않습니다.
const DB_NAME = 'gemini-chat'
const STORE = 'attachments'

export const MAX_FILES = 5
export const MAX_IMAGE_SIDE = 1600
export const MAX_PDF_BYTES = 3 * 1024 * 1024
export const MAX_TEXT_BYTES = 300 * 1024
export const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024

export const ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,application/pdf,' +
  '.txt,.md,.csv,.tsv,.json,.xml,.yaml,.yml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.rb,.php,.kt,.swift,.sql,.sh,.log'

const TEXT_EXT = new Set(ACCEPT.split(',').filter((s) => s.startsWith('.')).map((s) => s.slice(1)))

const memory = new Map<string, string>()
let dbPromise: Promise<IDBDatabase> | null = null

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void) {
  const db = await openDb()
  return new Promise<T | undefined>((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(req ? req.result : undefined)
    t.onerror = () => reject(t.error)
  })
}

export async function putAttachmentData(id: string, data: string) {
  memory.set(id, data)
  try {
    await tx('readwrite', (s) => {
      s.put(data, id)
    })
  } catch {
    // 저장에 실패해도 현재 세션에서는 메모리 캐시로 동작합니다.
  }
}

export async function getAttachmentData(id: string): Promise<string | undefined> {
  const cached = memory.get(id)
  if (cached !== undefined) return cached
  try {
    const data = await tx<string>('readonly', (s) => s.get(id))
    if (typeof data === 'string') memory.set(id, data)
    return data
  } catch {
    return undefined
  }
}

export async function deleteAttachmentData(ids: string[]) {
  if (ids.length === 0) return
  ids.forEach((id) => memory.delete(id))
  try {
    await tx('readwrite', (s) => {
      ids.forEach((id) => s.delete(id))
    })
  } catch {
    // 무시
  }
}

export function toDataUrl(a: Attachment, data: string) {
  return `data:${a.mimeType};base64,${data}`
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function detectKind(file: File): AttachmentKind | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return 'image'
  if (file.type === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (file.type.startsWith('text/') || TEXT_EXT.has(ext)) return 'text'
  return null
}

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

// 큰 이미지는 브라우저에서 줄여서 요청 크기를 작게 유지합니다.
async function prepareImage(file: File): Promise<{ data: string; mimeType: string; size: number }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  const keepOriginal = scale === 1 && file.size <= 1024 * 1024 && file.type !== 'image/gif'
  if (keepOriginal) {
    bitmap.close()
    const url = await readAsDataUrl(file)
    return { data: url.split(',')[1], mimeType: file.type, size: file.size }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 변환 실패'))), 'image/jpeg', 0.85),
  )
  const url = await readAsDataUrl(blob)
  return { data: url.split(',')[1], mimeType: 'image/jpeg', size: blob.size }
}

// 선택한 파일을 첨부 가능한 형태로 변환하고 IndexedDB에 저장합니다.
export async function prepareAttachment(file: File): Promise<Attachment> {
  const kind = detectKind(file)
  if (!kind) throw new Error(`지원하지 않는 파일 형식입니다: ${file.name}`)

  let data: string
  let mimeType = file.type
  let size = file.size

  if (kind === 'image') {
    if (file.size > MAX_IMAGE_INPUT_BYTES) throw new Error(`이미지가 너무 큽니다(최대 20MB): ${file.name}`)
    const img = await prepareImage(file)
    data = img.data
    mimeType = img.mimeType
    size = img.size
  } else if (kind === 'pdf') {
    if (file.size > MAX_PDF_BYTES) throw new Error(`PDF는 3MB 이하만 첨부할 수 있습니다: ${file.name}`)
    data = (await readAsDataUrl(file)).split(',')[1]
    mimeType = 'application/pdf'
  } else {
    if (file.size > MAX_TEXT_BYTES) throw new Error(`텍스트 파일은 300KB 이하만 첨부할 수 있습니다: ${file.name}`)
    data = await file.text()
    mimeType = 'text/plain'
  }

  const attachment: Attachment = { id: createId(), name: file.name || 'image.png', mimeType, size, kind }
  await putAttachmentData(attachment.id, data)
  return attachment
}
