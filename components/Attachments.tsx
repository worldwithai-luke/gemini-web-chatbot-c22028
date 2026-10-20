'use client'

import { useEffect, useState } from 'react'
import { FileText, FileCode2, X } from 'lucide-react'
import type { Attachment } from '@/lib/types'
import { formatSize, getAttachmentData, toDataUrl } from '@/lib/attachments'

// IndexedDB에서 이미지 데이터를 읽어 data URL로 돌려줍니다.
function useImageUrl(a: Attachment) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (a.kind !== 'image') return
    let alive = true
    getAttachmentData(a.id).then((data) => {
      if (alive && data) setUrl(toDataUrl(a, data))
    })
    return () => {
      alive = false
    }
  }, [a])
  return url
}

function openImage(url: string) {
  // data URL은 새 탭에서 바로 열리지 않으므로 Blob URL로 변환합니다.
  fetch(url)
    .then((r) => r.blob())
    .then((b) => window.open(URL.createObjectURL(b), '_blank', 'noopener'))
}

function FileChip({ a, compact }: { a: Attachment; compact?: boolean }) {
  const Icon = a.kind === 'pdf' ? FileText : FileCode2
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-[#1c1d22] ${
        compact ? 'h-16 w-48' : 'max-w-64'
      }`}
    >
      <div
        className={`grid size-9 shrink-0 place-items-center rounded-lg text-white ${
          a.kind === 'pdf' ? 'bg-red-500' : 'bg-[#4f8bff]'
        }`}
      >
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{a.name}</p>
        <p className="text-xs text-zinc-500">
          {a.kind === 'pdf' ? 'PDF' : a.name.split('.').pop()?.toUpperCase() || '텍스트'} · {formatSize(a.size)}
        </p>
      </div>
    </div>
  )
}

function ImageThumb({ a, className }: { a: Attachment; className: string }) {
  const url = useImageUrl(a)
  return url ? (
    <button type="button" onClick={() => openImage(url)} className="block" aria-label={`${a.name} 크게 보기`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={a.name} className={`${className} object-cover`} />
    </button>
  ) : (
    <div className={`${className} animate-pulse bg-zinc-200 dark:bg-white/5`} />
  )
}

// 입력창 위에 표시되는 첨부 대기 목록
export function PendingAttachment({ a, onRemove }: { a: Attachment; onRemove: () => void }) {
  return (
    <div className="group relative shrink-0">
      {a.kind === 'image' ? (
        <ImageThumb a={a} className="size-16 rounded-xl border border-zinc-200 dark:border-white/10" />
      ) : (
        <FileChip a={a} compact />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${a.name} 첨부 취소`}
        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-zinc-900 text-white shadow ring-2 ring-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-[#1c1d22]"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

// 보낸 메시지에 표시되는 첨부 목록
export function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  const images = attachments.filter((a) => a.kind === 'image')
  const files = attachments.filter((a) => a.kind !== 'image')
  return (
    <div className="flex flex-col items-end gap-2">
      {images.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {images.map((a) => (
            <ImageThumb
              key={a.id}
              a={a}
              className={`rounded-2xl border border-zinc-200 dark:border-white/10 ${
                images.length === 1 ? 'max-h-72 max-w-full sm:max-w-sm' : 'size-32'
              }`}
            />
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {files.map((a) => (
            <FileChip key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  )
}
