# PersonalOS

A self-hosted personal operating system for students — AI study assistant, life tracker, and productivity hub in one dark-mode PWA. Works on desktop and mobile.

---

## What it does

PersonalOS combines an AI-powered study toolkit with a full personal life OS:

**Study & Learning**
- Upload lecture scripts (PDF, DOCX, TXT, MD / Obsidian) — text is extracted, chunked, and stored
- Ask Claude questions about your documents via RAG
- Auto-generate flashcards with SM-2 spaced repetition
- Build interactive mind maps from your scripts
- Exam mode: AI generates open questions, grades your free-text answers
- Semantic search across all your documents (optional, via Voyage AI)
- Whisper audio transcription → searchable document

**Life OS**
- Habits with daily tracking and heatmap calendar
- Finance: transactions, categories, monthly budgets
- Fitness: workout logging, exercises, body weight tracker
- Goals: week / month / year goals with linked todos and time tracking
- Journal with mood tracking and AI reflection
- Calendar with color-coded events
- Weekly planner: schedule builder for study blocks, gym, university, travel
- Focus (Pomodoro) sessions
- Time tracking by project or goal
- Contacts, quick notes, media tracker (books / shows / movies)

**Integrations**
- GitHub: repos, open issues, PRs, activity feed
- Google Drive: browse and import files directly
- Server monitoring: ping checks with response times and container management
- News feed: RSS proxy (Tagesschau, BBC World, custom)
- JArvis: conversational AI assistant with voice input and TTS

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 25 · Spring Boot 3 |
| Database | SQLite (single-file, JDBC — no ORM) |
| PDF/DOCX parsing | Apache PDFBox 3 · Apache POI 5 |
| Primary AI | Anthropic Claude API |
| Fallback AI | Google Gemini API |
| Embeddings | Voyage AI |
| Audio | OpenAI Whisper API |
| Frontend | Vite · React 19 · TypeScript · Tailwind v4 |
| Data fetching | TanStack Query v5 · React Router v7 |
| Mobile/PWA | vite-plugin-pwa · Workbox |

---

## Requirements

- Java 21+ (tested on Java 25)
- Maven 3.x
- Node.js 20+
- At least one AI API key (Claude or Gemini)

```bash
# macOS
brew install openjdk maven node

# Debian/Ubuntu
sudo apt install openjdk-21-jdk maven nodejs npm
```

---

## Getting Started

```bash
# 1. Clone
git clone <repo-url>
cd PersonalOs

# 2. Set API keys — at least one AI key is required
export CLAUDE_API_KEY=sk-ant-...
# export GEMINI_API_KEY=AIza...         # alternative / fallback

# 3. Optional integrations
# export VOYAGE_API_KEY=pa-...          # semantic vector search
# export OPENAI_API_KEY=sk-...          # audio transcription (Whisper)
# export GITHUB_TOKEN=ghp_...           # GitHub integration
# export GITHUB_USERNAME=yourname       # GitHub integration
# export SERVER_HOST=1.2.3.4            # server monitoring widget
# export GOOGLE_DRIVE_API_KEY=AIza...   # Google Drive import

# 4. Run the backend
mvn spring-boot:run

# 5. Run the frontend dev server (separate terminal)
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend (dev) | http://localhost:5173 |
| Backend API | http://localhost:8080/api |

For production, run `npm run build` — the output in `frontend/dist/` is served statically by Spring Boot.

### Mobile / PWA

The app is a Progressive Web App. On mobile, open it in Chrome or Safari and use "Add to Home Screen" to install it as a native-feeling app. All pages are responsive and work on small screens via a bottom navigation bar.

---

## Configuration

All secrets are read from environment variables. Empty = feature disabled. No secrets go in source code.

| Variable | Required | Purpose |
|---|---|---|
| `CLAUDE_API_KEY` | one of these two | Anthropic Claude — primary AI |
| `GEMINI_API_KEY` | one of these two | Google Gemini — AI fallback |
| `VOYAGE_API_KEY` | optional | Semantic vector search |
| `OPENAI_API_KEY` | optional | Whisper audio transcription |
| `GITHUB_TOKEN` | optional | GitHub integration |
| `GITHUB_USERNAME` | optional | GitHub integration |
| `SERVER_HOST` | optional | Server ping widget |
| `GOOGLE_DRIVE_API_KEY` | optional | Google Drive import |

---

## Obsidian Integration

PersonalOS can ingest Markdown files directly — upload any `.md` file from your Obsidian vault via the Study page. Your notes are chunked, embedded, and searchable alongside your PDFs. You can then ask Claude questions across your entire knowledge base and generate flashcards from your handwritten notes.

---

## Project Structure

```
src/main/java/de/lecturebase/
├── api/             # REST controllers (one per feature area, 30+)
├── ingestion/       # DocumentParser (PDF, DOCX, TXT, MD), TextChunker, IngestionService
├── storage/         # JDBC repositories, DatabaseConfig, SQLite schema
├── ai/              # Claude/Gemini clients, RAG, MindMap, Embeddings, OCR
├── model/           # Plain Java POJOs
└── search/          # Full-text search service

frontend/src/
├── api/             # client.ts (axios + auth interceptor), types.ts
├── components/      # Sidebar, MobileNav, PageHeader, UI primitives
└── pages/           # 27 page components, one per route
```

---

## Pages & Routes

| Route | Purpose |
|---|---|
| `/dashboard` | Bento overview: stats, habits, todos, finance, journal, news, GitHub |
| `/study` | Upload documents (PDF, DOCX, TXT, MD), manage library |
| `/flashcards` | Spaced repetition card review (SM-2) |
| `/mindmap` | Interactive concept tree, quiz, node chat, glossary export |
| `/search` | Keyword + semantic search across all documents |
| `/exam` | AI-generated open exam questions with grading |
| `/planner` | Study planner with exam countdown and daily progress log |
| `/audio` | Audio upload → Whisper transcription → searchable document |
| `/pdf` | Inline PDF viewer |
| `/projects` | Project workspaces: group documents, todos, notes |
| `/todos` | Global todo list |
| `/goals` | Goals by horizon (week / month / year) with progress and time tracking |
| `/habits` | Daily habit tracker with heatmap calendar |
| `/journal` | Daily journal with mood (1–5) and AI reflection |
| `/finance` | Transactions, categories, monthly budget overview |
| `/fitness` | Workout log, exercise sets, body weight tracker |
| `/focus` | Pomodoro session timer |
| `/time` | Time entries by project or goal |
| `/calendar` | Event management with color coding |
| `/notes` | Quick sticky notes (pinnable, colored) |
| `/contacts` | Contact management with tags |
| `/media` | Book / show / movie tracker with reading sessions |
| `/reading` | Reading session log linked to media items |
| `/planner-week` | Weekly schedule builder |
| `/github` | GitHub repos, issues, PRs, activity |
| `/server` | Server ping, metrics, container management |

---

## API Reference (key endpoints)

### Documents
```
POST   /api/upload                         Upload file (PDF, DOCX, TXT, MD) + optional tags
GET    /api/documents                      List all documents
DELETE /api/documents/{id}                 Delete document and all chunks
GET    /api/documents/{id}/file            Serve original file
```

### Search & Q&A
```
GET  /api/search?q=...                     Keyword search across chunks
POST /api/ask                              { "question": "..." } → RAG answer from Claude
```

### Flashcards
```
GET  /api/flashcards?documentId=1          List cards for a document
GET  /api/flashcards/due                   Cards due for review today
POST /api/flashcards/{id}/rate?known=true  SM-2 rating
GET  /api/flashcards/generate-stream       SSE streaming card generation
```

### Mind Map
```
POST /api/mindmap/build?documentId=1       Build / rebuild concept tree
GET  /api/mindmap?documentId=1             Fetch tree JSON
POST /api/mindmap/chat                     { concept, message, history }
POST /api/mindmap/quiz                     ["concept1", "concept2"]
GET  /api/export/glossary?documentId=1     Download Markdown glossary
```

### Study Planner
```
GET    /api/planner                                        List all plans
POST   /api/planner?documentId=&examDate=&totalPages=      Create plan
POST   /api/planner/{id}/log?pages=N                       Log pages studied today
GET    /api/planner/{id}/history                           14-day progress chart
DELETE /api/planner/{id}                                   Delete plan
```

### Exam
```
GET  /api/quiz/generate?documentId=1&count=5   Generate open-ended exam questions
POST /api/quiz/evaluate                         { question, chunkContext, userAnswer }
```

### Audio
```
POST /api/audio/transcribe    Multipart: audio file → transcript + optional document ingest
```

### Life OS (Habits / Finance / Fitness / Goals / Journal)
```
GET  /api/habits                  GET  /api/finance/transactions    GET  /api/fitness/workouts
POST /api/habits                  POST /api/finance/transactions    POST /api/fitness/workouts
GET  /api/habits/week             GET  /api/finance/summary         GET  /api/fitness/stats
GET  /api/journal                 GET  /api/goals                   POST /api/focus/session
POST /api/journal                 POST /api/goals                   GET  /api/focus/stats
GET  /api/journal/mood-trend      PATCH /api/goals/{id}             GET  /api/time
```

Full API: see controllers in `src/main/java/de/lecturebase/api/`.

---

## Uploaded Files

Files are stored in the `uploads/` directory next to the JAR, named `{sha256}_{originalname}`. SQLite stores metadata in `lecturebase.db`. Both are excluded from Git.
