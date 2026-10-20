'use client'

import { useEffect, useRef } from 'react'
import { ArrowUp, Loader2, Paperclip, Square } from 'lucide-react'
import type { Attachment } from '@/lib/types'
import { ACCEPT } from '@/lib/attachments'
import { PendingAttachment } from './Attachments'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop: () => void
  isStreaming: boolean
  attachments: Attachment[]
  preparing: boolean
  onAddFiles: (files: File[]) => void
  onRemoveAttachment: (id: string) => void
}

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  attachments,
  preparing,
  onAddFiles,
  onRemoveAttachment,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  useEffect(() => {
    if (!isStreaming) ref.current?.focus()
  }, [isStreaming])

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isStreaming && !preparing

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit()
      }}
      className="mx-auto w-full max-w-3xl"
    >
      <div className="rounded-3xl border border-zinc-300 bg-white p-2 shadow-lg shadow-zinc-900/5 transition focus-within:border-zinc-400 dark:border-white/10 dark:bg-[#1c1d22] dark:shadow-black/30 dark:focus-within:border-white/20">
        {(attachments.length > 0 || preparing) && (
          <div className="scroll-thin flex gap-3 overflow-x-auto px-2 pt-2 pb-2">
            {attachments.map((a) => (
              <PendingAttachment key={a.id} a={a} onRemove={() => onRemoveAttachment(a.id)} />
            ))}
            {preparing && (
              <div className="grid size-16 shrink-0 place-items-center rounded-xl border border-dashed border-zinc-300 text-zinc-400 dark:border-white/10">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
          </div>
        )}
        <div className="flex items-end gap-1">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (files.length) onAddFiles(files)
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="이미지 또는 파일 첨부"
            title="이미지 또는 파일 첨부 (이미지, PDF, 텍스트/코드)"
            className="grid size-10 shrink-0 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-zinc-100"
          >
            <Paperclip className="size-5" />
          </button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files)
              if (files.length) {
                e.preventDefault()
                onAddFiles(files)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                if (canSend) onSubmit()
              }
            }}
            placeholder="Gemini에게 무엇이든 물어보세요"
            className="scroll-thin max-h-[200px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="응답 중지"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="보내기"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#4f8bff] to-[#9b6bff] text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-zinc-300 disabled:to-zinc-300 disabled:shadow-none dark:disabled:from-zinc-700 dark:disabled:to-zinc-700"
            >
              <ArrowUp className="size-5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-zinc-500">
        Gemini는 실수를 할 수 있습니다. 중요한 정보는 꼭 확인하세요. · Shift + Enter로 줄바꿈 · 이미지·파일은 첨부, 붙여넣기, 끌어다 놓기로 추가
      </p>
    </form>
  )
}
