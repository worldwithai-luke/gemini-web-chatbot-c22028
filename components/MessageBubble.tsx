'use client'

import { Sparkles } from 'lucide-react'
import Markdown from './Markdown'
import { MessageAttachments } from './Attachments'
import type { ChatMessage } from '@/lib/types'

export default function MessageBubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-2">
        {message.attachments && message.attachments.length > 0 && (
          <div className="max-w-[85%]">
            <MessageAttachments attachments={message.attachments} />
          </div>
        )}
        {message.content && (
          <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-zinc-200/80 px-4 py-2.5 text-[15px] leading-7 whitespace-pre-wrap break-words dark:bg-[#26272d]">
            {message.content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#4f8bff] via-[#9b6bff] to-[#e56bb0] text-white">
        <Sparkles className={`size-4 ${streaming ? 'animate-spin [animation-duration:2.5s]' : ''}`} />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {message.content ? (
          <div
            className={`markdown prose prose-zinc max-w-none text-[15px] leading-7 dark:prose-invert prose-headings:font-semibold prose-a:text-indigo-500 prose-pre:bg-transparent prose-table:text-sm ${
              streaming ? 'streaming-caret' : ''
            }`}
          >
            <Markdown content={message.content} />
          </div>
        ) : (
          <div className="dot-bounce flex h-7 items-center gap-1.5 text-zinc-400" aria-label="응답 생성 중">
            <span className="size-2 rounded-full bg-current" />
            <span className="size-2 rounded-full bg-current" />
            <span className="size-2 rounded-full bg-current" />
          </div>
        )}
      </div>
    </div>
  )
}
