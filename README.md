# LectureBase

A full-stack AI study assistant for university students. Upload lecture PDFs, ask questions, generate flashcards, build mind maps, track your progress — all in one dark-mode SPA.

---

## Features

### Documents
- **Upload** PDF and DOCX files — text is extracted, chunked with overlap, and stored in SQLite
- **Duplicate detection** via SHA-256 hash — re-uploading the same file is rejected with a 409
- **Tag system** — assign tags at upload time, filter documents by tag
- **PDF Viewer** — view any uploaded PDF directly in the browser via a built-in inline viewer

### Search & Q&A
- **Keyword search** — fast full-text SQL search across all chunks with document/page references
- **Semantic search** — optional vector search via Voyage AI embeddings (requires `VOYAGE_API_KEY`)
- **RAG chat** — ask questions in natural language; Claude answers using only your uploaded scripts

### AI Learning Tools
- **Flashcard generator** — AI creates question/answer pairs from each chunk; exportable
- **Spaced repetition (SM-2)** — rate cards as known/unknown; due dates calculated per the SM-2 algorithm
- **Summaries** — one-click document summary, generated and cached per document
- **Probeklausur (Exam mode)** — AI generates open-ended exam questions from your scripts; you answer freely; Claude scores and gives feedback with a model answer
- **Mind Map** — extracts key concepts per chunk, builds a hierarchical tree; click any node to open a concept-focused chat panel
- **Mind Map Quiz** — generate a multiple-choice quiz from the concepts in the current mind map
- **Glossary export** — download a Markdown glossary of all concepts for a document

### Planning & Organisation
- **Lernplaner (Study Planner)** — create a plan with exam date and total pages; tracks daily progress, remaining pages, days left, and daily goal
- **Projects** — group documents together with notes and a color label
- **Todos** — task list, optionally linked to a project

### Audio
- **Whisper transcription** — upload an audio recording (MP3, WAV, M4A, WebM, …); OpenAI Whisper transcribes it and the result is saved as a searchable document (requires `OPENAI_API_KEY`)

### Dashboard & Integrations
- **Dashboard** — bento-grid overview with stats, server status, todos, GitHub activity, and a live news feed
- **JArvis** — conversational AI assistant with voice input (Web Speech API) and TTS output
- **GitHub integration** — proxied view of your repos and open issues (requires `GITHUB_TOKEN` + `GITHUB_USERNAME`)
- **Server monitoring** — ping check against a configured host with response time
- **News feed** — RSS proxy for Tagesschau, BBC World, and custom feeds
- **Google Drive import** — browse and import files from Google Drive (requires `GOOGLE_DRIVE_API_KEY`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 25, Spring Boot 3 |
| Database | SQLite (JDBC, single-file) |
| PDF parsing | Apache PDFBox 3 |
| DOCX parsing | Apache POI 5 |
| Primary AI | Anthropic Claude API |
| Fallback AI | Google Gemini API |
| Embeddings | Voyage AI |
| Audio | OpenAI Whisper API |
| Frontend | Vite · React 19 · TypeScript · Tailwind v4 |
| State/data | TanStack Query v5 · React Router v7 |

---

## Project Structure

```
src/main/java/de/lecturebase/
├── ingestion/       # DocumentParser, TextChunker, IngestionService
├── storage/         # ChunkRepository, EmbeddingRepository, DatabaseConfig
├── ai/              # AiClient (Claude + Gemini), EmbeddingClient (Voyage),
│                    # RagService, MindMapService, QuizService, ChatSession
└── api/             # REST controllers (one per feature area)

frontend/src/
├── api/             # client.ts (axios), types.ts
├── components/      # Sidebar, PageHeader, JArvisOrb (canvas animation)
└── pages/           # One page component per route
```

---

## Requirements

- Java 21+ (tested on Java 25)
- Maven 3.x
- Node.js 20+ (for the frontend dev server)
- At minimum one AI API key (Claude or Gemini)

**Install on macOS:**
```bash
brew install openjdk maven node
```

---

## Getting Started

```bash
# 1. Clone
git clone <repo-url>
cd JP26

# 2. Set required API key (Claude or Gemini — at least one)
export CLAUDE_API_KEY=sk-ant-...
# export GEMINI_API_KEY=AIza...   # alternative / fallback

# 3. Optional integrations
# export VOYAGE_API_KEY=pa-...      # semantic search
# export OPENAI_API_KEY=sk-...      # audio transcription
# export GITHUB_TOKEN=ghp_...
# export GITHUB_USERNAME=yourname
# export SERVER_HOST=1.2.3.4        # server ping widget
# export GOOGLE_DRIVE_API_KEY=AIza...

# 4. Build & run the backend
mvn spring-boot:run

# 5. In a second terminal — run the frontend dev server
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend (dev) | http://localhost:5173 |
| Backend API | http://localhost:8080/api |

For production, `npm run build` outputs to `frontend/dist/` which is served statically by Spring Boot from `src/main/resources/static/`.

---

## API Reference (key endpoints)

### Documents
```
POST   /api/upload              multipart/form-data  file + optional tags
GET    /api/documents           list all documents
DELETE /api/documents/{id}      delete document + all chunks
GET    /api/documents/{id}/file serve the original file (PDF viewer)
```

### Search & Q&A
```
GET  /api/search?q=...          keyword search
POST /api/ask                   { "question": "..." } → RAG answer
```

### Flashcards
```
GET  /api/flashcards?documentId=1    list cards for a document
POST /api/flashcards/{id}/rate?known=true   SM-2 rating
GET  /api/flashcards/due              cards due for review today
```

### Mind Map
```
POST /api/mindmap/build?documentId=1   build/rebuild concept tree
GET  /api/mindmap?documentId=1         fetch tree JSON
POST /api/mindmap/chat                 { concept, message, history }
POST /api/mindmap/quiz                 [ "concept1", "concept2", ... ]
GET  /api/export/glossary?documentId=1 download Markdown glossary
```

### Study Planner
```
GET    /api/planner                           list all plans
POST   /api/planner?documentId=&examDate=&totalPages=   create plan
DELETE /api/planner/{id}                      delete plan
POST   /api/planner/{id}/log?pages=N          log pages studied today
GET    /api/planner/{id}/history              14-day log
```

### Exam
```
GET  /api/quiz/generate?documentId=1&count=5   generate open questions
POST /api/quiz/evaluate                         { question, chunkContext, userAnswer }
```

### Audio
```
POST /api/audio/transcribe   multipart/form-data  file → transcript + optional document ingest
```

### Other
```
GET  /api/summaries?documentId=1
GET  /api/stats
GET  /api/news?feed=de|world|bvb|vikings
GET  /api/github/repos
GET  /api/github/issues?repo=owner/name
GET  /api/server/status
POST /api/jarvis/chat
```

---

## Navigation (sidebar routes)

| Route | Page |
|---|---|
| `/dashboard` | Bento overview (stats, news, todos, GitHub, server) |
| `/study` | Upload documents, manage library |
| `/flashcards` | Study flashcards with spaced repetition |
| `/mindmap` | Interactive concept tree + quiz + node chat |
| `/search` | Keyword + semantic search |
| `/exam` | AI-generated open exam questions |
| `/planner` | Study planner with exam countdown |
| `/audio` | Audio upload → Whisper transcription |
| `/pdf` | Inline PDF viewer |
| `/projects` | Project workspace with notes and todos |
| `/todos` | Global todo list |
| `/jarvis` | JArvis AI assistant with voice |
| `/github` | GitHub repo and issue viewer |
| `/server` | Server ping status |

---

## Configuration

All secrets are read from environment variables; the properties file only contains the `${VAR:}` references (empty default = feature disabled).

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
