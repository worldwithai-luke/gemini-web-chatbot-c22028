# Gemini Chat — Gemini 기반 웹 챗봇

학교나 외부 환경 어디서든 브라우저만으로 접속해 쓸 수 있는 **Google Gemini 기반 웹 챗봇**입니다.
ChatGPT / Gemini 웹과 비슷한 인터페이스로, 답변이 실시간으로 스트리밍되고 마크다운과 코드 하이라이팅을 지원합니다.

## 주요 기능

- 💬 **좌측 사이드바**(새 대화, 대화 목록 · 삭제, 테마 전환) + 중앙 대화창 + 하단 입력창
- ⚡ **스트리밍 응답**: AI 답변이 생성되는 즉시 글자 단위로 출력되고 언제든 **중지**할 수 있음
- 📝 **마크다운 렌더링**: 굵게, 리스트, 표(GFM), 링크, 코드 블록 **하이라이팅 + 복사 버튼**
- 🔄 로딩 인디케이터, 자동 스크롤(위로 스크롤하면 멈추고 "맨 아래로" 버튼 표시), 오류 시 "다시 시도"
- 🌗 세련된 다크 테마(기본) + 라이트 모드
- 📱 모바일/PC 반응형 (모바일에서는 사이드바가 슬라이드 드로어로 열림)
- 💾 대화 기록은 브라우저 `localStorage`에 저장 (서버/계정 불필요)

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript |
| 스타일 | Tailwind CSS v4 + `@tailwindcss/typography` |
| AI SDK | Google Gen AI SDK (`@google/genai`) — 기본 모델 `gemini-2.5-flash` |
| 마크다운 | `react-markdown`, `remark-gfm`, `rehype-highlight`, `highlight.js` |
| 아이콘 | `lucide-react` |

> `gemini-1.5-flash`는 Google에서 지원이 종료되어, 현재 무료 등급에서도 사용할 수 있는 `gemini-2.5-flash`를 기본값으로 사용합니다. `GEMINI_MODEL` 환경 변수로 바꿀 수 있습니다.

## 1. 설치

새 폴더에서 처음부터 만든다면 아래 패키지를 설치합니다. (이 저장소를 받았다면 `npm install`만 실행하면 됩니다.)

```bash
npm install next react react-dom @google/genai react-markdown remark-gfm rehype-highlight highlight.js lucide-react
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss @tailwindcss/typography
```

## 2. 환경 변수

```bash
cp .env.local.example .env.local
```

`.env.local`을 열고 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받은 키를 넣습니다.

```env
GOOGLE_GENERATIVE_AI_API_KEY=발급받은_API_키
# GEMINI_MODEL=gemini-2.5-flash   # (선택)
```

API 키는 **서버(API 라우트)에서만** 읽히며 브라우저로 전달되지 않습니다. `.env.local`은 `.gitignore`에 포함되어 있어 Git에 올라가지 않습니다.

## 3. 실행

```bash
npm run dev
# http://localhost:3000 접속
```

## 프로젝트 구조

```
.
├── app/
│   ├── api/chat/route.ts   # Gemini 스트리밍 API 라우트 (서버 전용, API 키 사용)
│   ├── globals.css         # Tailwind, 다크모드 variant, 커서/로딩 애니메이션, 코드블록 스타일
│   ├── layout.tsx          # 폰트, 메타데이터, 테마 깜빡임 방지 스크립트
│   └── page.tsx            # 메인 페이지 → <ChatApp />
├── components/
│   ├── ChatApp.tsx         # 상태 관리, 스트리밍 수신, 자동 스크롤, 환영 화면
│   ├── Sidebar.tsx         # 새 대화 버튼, 날짜별 대화 목록, 테마 전환
│   ├── MessageBubble.tsx   # 사용자/AI 메시지 말풍선, 로딩 인디케이터
│   ├── Markdown.tsx        # 마크다운 + 코드 하이라이팅 + 복사 버튼
│   └── Composer.tsx        # 자동 높이 입력창 (Enter 전송, Shift+Enter 줄바꿈, 중지 버튼)
├── lib/
│   ├── types.ts            # ChatMessage / Conversation 타입
│   └── storage.ts          # localStorage 저장/불러오기
├── .env.local.example      # 환경 변수 예시
├── netlify.toml            # Netlify 빌드 설정
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

### 동작 흐름

1. 사용자가 메시지를 보내면 `ChatApp`이 지금까지의 대화를 `POST /api/chat`으로 전송합니다.
2. `route.ts`가 `@google/genai`의 `generateContentStream`으로 Gemini를 호출하고, 받은 텍스트 조각을 `ReadableStream`으로 그대로 흘려보냅니다.
3. 브라우저는 `fetch` 응답 본문을 `getReader()`로 읽으며 메시지에 글자를 이어 붙이고, 마크다운으로 즉시 렌더링합니다.

## 배포 시 환경 변수 설정

### Netlify

1. 저장소를 Netlify에 연결하면 Next.js가 자동 감지됩니다 (빌드 명령 `npm run build`, 별도 플러그인 설치 불필요).
2. **Project configuration → Environment variables → Add a variable**
   - Key: `GOOGLE_GENERATIVE_AI_API_KEY`, Value: 본인 키
   - Scopes에 **Functions(런타임)** 이 포함되어 있는지 확인하세요. API 라우트는 서버리스 함수로 실행되므로 런타임에서 키를 읽어야 합니다.
3. 변수를 추가/변경한 뒤에는 **재배포(Trigger deploy)** 해야 반영됩니다.
4. 💡 Netlify에서는 키를 따로 넣지 않아도 **Netlify AI Gateway**가 Gemini 자격 증명을 자동으로 주입하므로 바로 동작합니다. 이 경우 사용량은 Netlify 크레딧으로 계산되며, 본인 키를 등록하면 그 키가 우선 사용됩니다.

### Vercel

1. 저장소를 Import하면 Next.js가 자동 감지됩니다.
2. **Settings → Environment Variables**에 `GOOGLE_GENERATIVE_AI_API_KEY` 추가 → Production / Preview / Development 중 필요한 환경 모두 체크.
3. 저장 후 **Redeploy** 해야 반영됩니다.
4. 무료(Hobby) 플랜의 함수 실행 시간 제한을 고려해 라우트에 `maxDuration = 60`을 지정해 두었습니다.

### 공통 주의사항

- 환경 변수 이름 앞에 **`NEXT_PUBLIC_`을 붙이지 마세요.** 붙이면 키가 브라우저 번들에 노출됩니다.
- `.env.local`은 로컬 전용이며 배포 서버에는 업로드되지 않습니다. 반드시 각 플랫폼 대시보드에서 따로 등록하세요.
- 키가 유출되었다면 Google AI Studio에서 즉시 삭제하고 새 키를 발급하세요.
- 공개 URL은 누구나 접속할 수 있으므로, 사용량이 걱정된다면 Google AI Studio에서 사용 한도를 확인하세요.
