export type Role = 'user' | 'model'

export type AttachmentKind = 'image' | 'pdf' | 'text'

// 첨부 파일 메타데이터. 실제 데이터는 브라우저 IndexedDB에 따로 저장합니다(lib/attachments.ts).
export interface Attachment {
  id: string
  name: string
  mimeType: string
  size: number
  kind: AttachmentKind
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  attachments?: Attachment[]
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: number
}

// API로 전송하는 첨부 파일. 이미지/PDF는 base64, 텍스트 파일은 원문 문자열입니다.
export interface ApiAttachment {
  name: string
  mimeType: string
  data: string
}

export interface ApiMessage {
  role: Role
  content: string
  attachments?: ApiAttachment[]
}
