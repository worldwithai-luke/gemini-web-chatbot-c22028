'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, Code2, Lightbulb, Menu, PenLine, Plus, Sparkles, GraduationCap } from 'lucide-react'
import Sidebar from './Sidebar'
import Composer from './Composer'
import MessageBubble from './MessageBubble'
import type { ApiMessage, Attachment, ChatMessage, Conversation } from '@/lib/types'
import { MAX_FILES, deleteAttachmentData, getAttachmentData, prepareAttachment } from '@/lib/attachments'
import { createId, loadConversations, saveConversations } from '@/lib/storage'

const SUGGESTIONS = [
  { icon: GraduationCap, title: '공부 도우미', prompt: '광합성의 명반응과 암반응 차이를 표로 정리해 줘' },
  { icon: Code2, title: '코드 설명', prompt: '파이썬으로 버블 정렬을 구현하고 시간 복잡도를 설명해 줘' },
  { icon: PenLine, title: '글쓰기', prompt: '환경 보호를 주제로 한 300자 발표문 초안을 써 줘' },
  { icon: Lightbulb, title: '아이디어', prompt: '고등학생이 할 수 있는 창의적인 동아리 활동 아이디어 5가지' },
]

function titleFrom(text: string) {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > 30 ? t.slice(0, 30) + '…' : t || '새 대화'
}

export default function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [atBottom, setAtBottom] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [pending, setPending] = useState<Attachment[]>([])
  const [preparing, setPreparing] = useState(false)
  const [dragging, setDragging] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const stickRef = useRef(true)

  // 초기 로드
  useEffect(() => {
    setConversations(loadConversations())
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    setSidebarOpen(window.matchMedia('(min-width: 768px)').matches)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveConversations(conversations)
  }, [conversations, hydrated])

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId])
  const messages = active?.messages ?? []

  // 자동 스크롤: 사용자가 맨 아래에 있을 때만 따라갑니다.
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    stickRef.current = bottom
    setAtBottom(bottom)
  }

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = true
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  const isMobile = () => !window.matchMedia('(min-width: 768px)').matches

  const updateConversation = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  const newChat = () => {
    abortRef.current?.abort()
    setActiveId(null)
    setInput('')
    setError(null)
    if (isMobile()) setSidebarOpen(false)
  }

  const selectChat = (id: string) => {
    if (streamingId) abortRef.current?.abort()
    setActiveId(id)
    setError(null)
    stickRef.current = true
    if (isMobile()) setSidebarOpen(false)
  }

  const deleteChat = (id: string) => {
    const conv = conversations.find((c) => c.id === id)
    if (conv) deleteAttachmentData(conv.messages.flatMap((m) => m.attachments?.map((a) => a.id) ?? []))
    if (id === activeId) {
      abortRef.current?.abort()
      setActiveId(null)
    }
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

  const addFiles = async (files: File[]) => {
    const room = MAX_FILES - pending.length
    if (room <= 0) {
      setError(`파일은 한 번에 최대 ${MAX_FILES}개까지 첨부할 수 있습니다.`)
      return
    }
    setPreparing(true)
    for (const f of files.slice(0, room)) {
      try {
        const a = await prepareAttachment(f)
        setPending((prev) => [...prev, a])
      } catch (err) {
        setError((err as Error).message)
      }
    }
    setPreparing(false)
  }

  const removePending = (id: string) => {
    setPending((prev) => prev.filter((a) => a.id !== id))
    deleteAttachmentData([id])
  }

  // 전송용 메시지로 변환하며 IndexedDB에서 첨부 데이터를 불러옵니다.
  const toApi = async (m: ChatMessage): Promise<ApiMessage> => {
    const atts = m.attachments?.length
      ? (
          await Promise.all(
            m.attachments.map(async (a) => {
              const data = await getAttachmentData(a.id)
              return data ? { name: a.name, mimeType: a.mimeType, data } : null
            }),
          )
        ).filter((x): x is NonNullable<typeof x> => !!x)
      : undefined
    return { role: m.role, content: m.content, ...(atts?.length ? { attachments: atts } : {}) }
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('theme', next)
  }

  const send = async (text: string, retryFromId?: string, retryAttachments?: Attachment[]) => {
    const content = text.trim()
    const atts = retryAttachments ?? (retryFromId ? [] : pending)
    if ((!content && atts.length === 0) || streamingId || preparing) return
    setError(null)
    setInput('')
    if (!retryFromId) setPending([])
    stickRef.current = true

    const userMsg: ChatMessage = {
      id: createId(),
      role: 'user',
      content,
      ...(atts.length ? { attachments: atts } : {}),
    }
    const botMsg: ChatMessage = { id: createId(), role: 'model', content: '' }

    let convId = activeId
    let history: ChatMessage[]
    if (!convId || !active) {
      convId = createId()
      history = [userMsg]
      const conv: Conversation = {
        id: convId,
        title: titleFrom(content || atts[0]?.name || ''),
        messages: [userMsg, botMsg],
        updatedAt: Date.now(),
      }
      setConversations((prev) => [conv, ...prev])
      setActiveId(convId)
    } else {
      const cut = retryFromId ? active.messages.findIndex((m) => m.id === retryFromId) : -1
      const base = cut >= 0 ? active.messages.slice(0, cut) : active.messages
      history = [...base.filter((m) => m.content || m.attachments?.length), userMsg]
      updateConversation(convId, (c) => ({ ...c, messages: [...base, userMsg, botMsg], updatedAt: Date.now() }))
      // 최근 대화를 목록 맨 위로
      setConversations((prev) => {
        const i = prev.findIndex((c) => c.id === convId)
        return i > 0 ? [prev[i], ...prev.slice(0, i), ...prev.slice(i + 1)] : prev
      })
    }

    const id = convId
    const controller = new AbortController()
    abortRef.current = controller
    setStreamingId(botMsg.id)

    const appendBot = (delta: string) =>
      updateConversation(id, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, content: m.content + delta } : m)),
      }))

    try {
      const apiMessages = await Promise.all(history.map(toApi))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `요청 실패 (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        appendBot(decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || '알 수 없는 오류가 발생했습니다.')
      }
    } finally {
      // 내용 없이 끝난 응답 자리는 제거
      updateConversation(id, (c) => ({
        ...c,
        messages: c.messages.filter((m) => m.id !== botMsg.id || m.content),
      }))
      setStreamingId(null)
      abortRef.current = null
    }
  }

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) return
    // 마지막 사용자 메시지부터 다시 전송
    send(lastUser.content, lastUser.id, lastUser.attachments ?? [])
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        theme={theme}
        onNew={newChat}
        onSelect={selectChat}
        onDelete={deleteChat}
        onClose={() => setSidebarOpen(false)}
        onToggleTheme={toggleTheme}
      />

      <main
        className="relative flex min-w-0 flex-1 flex-col"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setDragging(true)
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const files = Array.from(e.dataTransfer.files)
          if (files.length) addFiles(files)
        }}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-3xl border-2 border-dashed border-[#7c8cff] bg-[#7c8cff]/10 text-lg font-medium text-[#7c8cff]">
            여기에 파일을 놓아 첨부하세요
          </div>
        )}
        {/* 상단 바 */}
        <header className="flex h-14 shrink-0 items-center gap-2 px-3">
          {!sidebarOpen && (
            <>
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="사이드바 열기"
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-zinc-100"
              >
                <Menu className="size-5" />
              </button>
              <button
                onClick={newChat}
                aria-label="새 대화"
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-zinc-100"
              >
                <Plus className="size-5" />
              </button>
            </>
          )}
          <div className="ml-1 flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {active?.title ?? 'Gemini Chat'}
            </span>
            <span className="hidden rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-500 sm:inline dark:border-white/10">
              Gemini 2.5 Flash
            </span>
          </div>
        </header>

        {/* 대화 영역 */}
        <div ref={scrollRef} onScroll={onScroll} className="scroll-thin flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col justify-center px-4 pb-10">
              <div className="mb-2 flex items-center gap-2 text-zinc-500">
                <Sparkles className="size-5 text-[#9b6bff]" />
                <span className="text-sm font-medium">Powered by Google Gemini</span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                <span className="gradient-text">안녕하세요!</span>
              </h1>
              <p className="mt-2 text-2xl font-medium text-zinc-400 sm:text-3xl dark:text-zinc-500">
                오늘은 무엇을 도와드릴까요?
              </p>
              <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
                  <button
                    key={title}
                    onClick={() => send(prompt)}
                    className="group flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-white/5 dark:bg-[#1a1b20] dark:hover:border-white/15 dark:hover:bg-[#1f2026]"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-[#7c8cff]" />
                      {title}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} streaming={m.id === streamingId} />
              ))}
              {error && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                  <span>{error}</span>
                  <button onClick={retry} className="shrink-0 rounded-lg px-3 py-1 font-medium hover:bg-red-500/10">
                    다시 시도
                  </button>
                </div>
              )}
              <div className="h-4" />
            </div>
          )}
        </div>

        {!atBottom && messages.length > 0 && (
          <button
            onClick={scrollToBottom}
            aria-label="맨 아래로"
            className="absolute bottom-32 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-zinc-300 bg-white shadow-lg transition hover:bg-zinc-50 dark:border-white/10 dark:bg-[#1c1d22] dark:hover:bg-[#25262c]"
          >
            <ArrowDown className="size-4" />
          </button>
        )}

        {/* 입력창 */}
        <div className="shrink-0 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:from-[#0f1013] dark:via-[#0f1013]">
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            onStop={() => abortRef.current?.abort()}
            isStreaming={!!streamingId}
            attachments={pending}
            preparing={preparing}
            onAddFiles={addFiles}
            onRemoveAttachment={removePending}
          />
        </div>
      </main>
    </div>
  )
}
