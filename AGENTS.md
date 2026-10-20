# AGENTS.md

## Overview
Gemini Chat: a Next.js 16 (App Router) chatbot UI that streams responses from Google Gemini. UI copy is Korean.

## Architecture
- `app/api/chat/route.ts` — the only server code. Accepts `{ messages: {role:'user'|'model', content}[] }`, calls `ai.models.generateContentStream` from `@google/genai`, and streams raw UTF-8 text (`text/plain`) back. No SSE framing.
- `components/ChatApp.tsx` — client state owner: conversations, active id, streaming, abort, auto-scroll, theme.
- `components/{Sidebar,Composer,MessageBubble,Markdown}.tsx` — presentational pieces.
- `lib/storage.ts` — conversation history lives in browser `localStorage` (`gemini-chat:conversations`). There are no accounts and nothing is stored server-side by design.

## Non-obvious decisions
- API key: if `GOOGLE_GENERATIVE_AI_API_KEY` is set, the client is built with that key AND an explicit `baseUrl` of `https://generativelanguage.googleapis.com`. The explicit base URL is required because on Netlify the AI Gateway injects `GOOGLE_GEMINI_BASE_URL`, which the SDK would otherwise pick up and send the user's own key to the gateway. If the variable is unset, `new GoogleGenAI({})` uses Netlify AI Gateway credentials automatically.
- Default model `gemini-2.5-flash` (supported both by Google directly and by Netlify AI Gateway); override with `GEMINI_MODEL`. gemini-1.5 models are retired.
- Dark mode is class-based (`@custom-variant dark` in `globals.css`); an inline script in `layout.tsx` applies the saved theme before paint. Default is dark.
- Code blocks always use the `github-dark` highlight.js theme in both modes.
- `typescript` is pinned to 5.x for Next.js compatibility.

## Conventions
- Tailwind v4 utility classes inline; no component library.
- 2-space indent, single quotes, no semicolons.
- Comments in Korean to match the codebase.
