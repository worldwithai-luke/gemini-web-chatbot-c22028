'use client'

import { MessageSquare, Moon, PanelLeftClose, Plus, Sparkles, Sun, Trash2 } from 'lucide-react'
import type { Conversation } from '@/lib/types'

interface Props {
  open: boolean
  conversations: Conversation[]
  activeId: string | null
  theme: 'light' | 'dark'
  onNew: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
  onToggleTheme: () => void
}

function groupLabel(ts: number) {
  const day = 24 * 60 * 60 * 1000
  const diff = Date.now() - ts
  if (diff < day) return '오늘'
  if (diff < 2 * day) return '어제'
  if (diff < 7 * day) return '지난 7일'
  return '이전'
}

export default function Sidebar({
  open,
  conversations,
  activeId,
  theme,
  onNew,
  onSelect,
  onDelete,
  onClose,
  onToggleTheme,
}: Props) {
  const groups: { label: string; items: Conversation[] }[] = []
  for (const c of conversations) {
    const label = groupLabel(c.updatedAt)
    const g = groups.find((x) => x.label === label)
    if (g) g.items.push(c)
    else groups.push({ label, items: [c] })
  }

  return (
    <>
      {/* 모바일 오버레이 */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200 bg-zinc-100/95 backdrop-blur transition-[transform,margin] duration-300 dark:border-white/5 dark:bg-[#16171b]/95 md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full md:-ml-72'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#4f8bff] via-[#9b6bff] to-[#e56bb0] text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="size-4" />
            </div>
            <span className="font-semibold tracking-tight">Gemini Chat</span>
          </div>
          <button
            onClick={onClose}
            aria-label="사이드바 닫기"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-zinc-100"
          >
            <PanelLeftClose className="size-5" />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={onNew}
            className="flex w-full items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm font-medium shadow-sm transition hover:border-zinc-400 hover:shadow dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/10"
          >
            <Plus className="size-4" />새 대화
          </button>
        </div>

        <nav className="scroll-thin mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {conversations.length === 0 && (
            <p className="px-2 text-sm text-zinc-500">아직 대화가 없어요. 첫 질문을 남겨 보세요!</p>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-2 text-xs font-medium text-zinc-500">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((c) => (
                  <li key={c.id} className="group relative">
                    <button
                      onClick={() => onSelect(c.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 pr-9 text-left text-sm transition ${
                        c.id === activeId
                          ? 'bg-zinc-200 text-zinc-900 dark:bg-white/10 dark:text-white'
                          : 'text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200'
                      }`}
                    >
                      <MessageSquare className="size-4 shrink-0 opacity-60" />
                      <span className="truncate">{c.title}</span>
                    </button>
                    <button
                      onClick={() => onDelete(c.id)}
                      aria-label="대화 삭제"
                      className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 opacity-100 transition hover:bg-red-500/10 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-3 dark:border-white/5">
          <button
            onClick={onToggleTheme}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
          <p className="px-2.5 pt-2 text-[11px] leading-relaxed text-zinc-500">
            대화 기록은 이 브라우저에만 저장됩니다.
          </p>
        </div>
      </aside>
    </>
  )
}
