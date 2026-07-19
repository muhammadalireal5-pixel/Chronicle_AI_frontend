# Chronicle AI — Frontend Interface

**Autonomous Deep Research Engine | Real-Time Research Console**

Chronicle AI is an autonomous deep research platform that conducts live web research, extracts verifiable evidence, and produces multi-pass fact-checked reports — all in real time. This is the **frontend interface** built with Next.js 16 and React 19, providing users with a seamless, interactive research experience.

---

## Why Chronicle AI Exists

Traditional research is slow, fragmented, and error-prone. Researchers spend hours manually searching, reading, cross-referencing, and synthesizing — only to produce reports riddled with confirmation bias and unverified claims. AI chatbots produce fluent text but routinely fabricate citations and statistics.

Chronicle AI solves both problems. It automates the entire research lifecycle — from topic exploration to evidence extraction, fact-checking, adversarial review, and polished report generation — while maintaining **full source provenance** for every claim. Every assertion traces back to a verified web source, and every report passes through a rigorous multi-pass verification pipeline before reaching the user.

---

## Key Features

### 🔬 Real-Time Research Pipeline Streaming
The frontend establishes a **Server-Sent Events (SSE)** connection to the backend, streaming every step of the research process live. Users watch as the AI searches the web, reads pages, extracts claims, checks alignment, and synthesizes findings — providing full transparency into how conclusions are reached.

**How it's achieved:** The `ResearchConsole` component connects to the `/api/research/stream` SSE endpoint. Each log entry is parsed, categorized (LOG, STATUS_UPDATE, REPORT), and rendered in a scrollable pipeline view. Status transitions (IDLE → RUNNING → SYNTHESIZING → COMPLETED) are tracked in real time with animated indicators.

### ⏸️ Interactive Pause, Chat & Resume
Users can **pause** an active research session at any point, **chat with the AI** to refine the research direction or add constraints, and then **resume** — with the engine incorporating the new instructions into the final report.

**How it's achieved:** The pause button triggers `/api/research/interrupt`, which sets a shared interrupt flag in the backend. While paused, a chat interface appears, powered by `/api/chat`. Messages are stored in MongoDB and injected into the synthesis pipeline's system prompt when research resumes via `/api/research/resume`.

### 📊 Rich Markdown Report Rendering
Final reports are rendered with full Markdown support including **tables, code blocks, Mermaid.js diagrams, blockquotes, and GitHub-flavored Markdown**. Diagrams are rendered client-side using Mermaid for visual clarity.

**How it's achieved:** The report view uses `react-markdown` with `remark-gfm` for GitHub-flavored extensions. A custom `Mermaid` component intercepts fenced code blocks tagged as `mermaid` and renders them as interactive SVG diagrams using the Mermaid.js library.

### 📄 One-Click PDF Export
Users can export the complete research report — including tables, diagrams, and citations — as a professionally formatted PDF document with a single click.

**How it's achieved:** The export function uses `html2pdf.js` to capture the rendered report DOM, convert it to a high-resolution canvas (2x scale), and output it as an A4 PDF with proper margins and JPEG compression.

### 📧 Email Sharing
Reports can be shared directly via email. The backend converts Markdown to styled HTML and sends it through the Resend email API.

**How it's achieved:** The share modal collects recipient email addresses, sends them along with the report content to `/api/research/share`, where the backend converts Markdown to HTML with inline styling and dispatches via Resend.

### 🔍 AI-Powered Topic Exploration
Before committing to a full research session, users can explore a broad topic to discover **trending, high-impact sub-topics** suggested by the AI based on live web search results.

**How it's achieved:** The `TopicModal` component calls `/api/research/explore`, which uses DuckDuckGo search results fed into Qwen-Max to identify and rank 3–5 significant sub-topics with relevance scores and reasoning.

### 🗂️ Research History & Session Management
All past research sessions are stored and accessible from a sidebar. Users can revisit completed reports, resume paused sessions, or delete old research.

**How it's achieved:** Research sessions are persisted in MongoDB with user IDs from Clerk authentication. The sidebar fetches history via `/api/chats/{userId}` and renders sessions with status indicators, timestamps, and one-click navigation.

### 🔐 Authentication & User Management
Secure authentication with sign-up, sign-in, and user profile management — ensuring research history is private and personalized.

**How it's achieved:** Clerk is integrated at the layout level via `ClerkProvider`. The `useAuth` and `useUser` hooks provide user identity, which is passed to the backend to scope all research sessions and chat history per user.

---

## How Qwen Powers the Frontend Experience

While the heavy AI processing happens on the backend, the frontend is designed around the capabilities of the **Qwen family of large language models** (by Alibaba Cloud):

- **Qwen-Max with Web Search** drives the topic exploration modal, providing real-time, search-grounded sub-topic suggestions
- **Qwen-Plus** powers the interactive chat during paused research, allowing users to refine scope and add constraints mid-session
- **Streaming architecture** ensures the frontend can display Qwen's reasoning process step-by-step, rather than presenting a black-box result

The frontend never calls Qwen directly — it consumes structured outputs from the backend, which handles all LLM orchestration, prompt engineering, and response parsing.

---

## How We Manage Accuracy at the Interface Level

Accuracy is a backend responsibility, but the frontend surfaces it transparently:

- **Source Integrity Badges** — Every report header displays verified vs. unverified source counts, high-confidence claim totals, and citation coverage
- **Appendix Transparency** — Reports include Appendix A (unverified sources with exclusion rationale), Appendix B (full fact-check and red-team notes), and Appendix C (complete evidence map linking claims to raw source text)
- **Citation Traceability** — Every `[N]` citation in the report links to a specific evidence unit with URL, verification status, and extraction date
- **Recency Warnings** — Reports automatically flag when no verified sources from recent years were found
- **Overconfidence Alerts** — A factuality auditor pass flags claims that are too strong relative to the evidence, surfaced as caution banners

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| Markdown | react-markdown, remark-gfm |
| Diagrams | Mermaid.js (client-side SVG rendering) |
| Charts | Recharts |
| Animations | Framer Motion |
| Auth | Clerk |
| PDF Export | html2pdf.js |
| Deployment | Vercel |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the Chronicle AI research console.

> **Note:** The frontend requires the Chronicle AI backend (engine) to be running. See the [engine README](../engine/README.md) for setup instructions.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for authentication |
| `CLERK_SECRET_KEY` | Clerk secret key (server-side) |
| `NEXT_PUBLIC_API_URL` | URL of the Chronicle AI backend engine |

---

## License

This project is part of the Chronicle AI platform.
