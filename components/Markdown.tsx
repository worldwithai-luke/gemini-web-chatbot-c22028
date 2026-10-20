'use client'

import { memo, useState, type ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'

function CodeBlock({ children, ...props }: ComponentProps<'pre'>) {
  const [copied, setCopied] = useState(false)
  const codeEl = Array.isArray(children) ? children[0] : children
  const className: string = (codeEl as { props?: { className?: string } })?.props?.className ?? ''
  const language = /language-([\w-]+)/.exec(className)?.[1] ?? 'code'

  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const pre = e.currentTarget.closest('[data-codeblock]')?.querySelector('pre')
    await navigator.clipboard.writeText(pre?.textContent ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div data-codeblock className="not-prose my-4 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-zinc-400">
        <span className="font-mono">{language}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-white/10 hover:text-zinc-100"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
      <pre {...props} className="scroll-thin overflow-x-auto">
        {children}
      </pre>
    </div>
  )
}

function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { detect: true }]]}
      components={{
        pre: CodeBlock,
        a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" />,
        table: (props) => (
          <div className="scroll-thin overflow-x-auto">
            <table {...props} />
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default memo(Markdown)
