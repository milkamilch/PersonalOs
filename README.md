# UniMind

A Java-based knowledge management system for university lecture scripts. Upload your PDFs and DOCX files, ask questions in natural language, and explore your knowledge as an interactive mind map.

---

## Features

- **Document Ingestion** — Upload PDF and DOCX lecture scripts; text is extracted and split into overlapping chunks
- **Keyword Search** — Fast full-text search across all uploaded documents with page and document references
- **AI-Powered Q&A** — Ask questions in natural language; relevant chunks are retrieved and Claude answers based solely on your scripts
- **Mind Map** — Claude extracts key concepts from each chunk and builds an interactive, force-directed concept graph in the browser

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.3 |
| Database | SQLite (via JDBC) |
| PDF parsing | Apache PDFBox 3 |
| DOCX parsing | Apache POI 5 |
| Graph algorithms | JGraphT |
| AI | Anthropic Claude API (Haiku) |
| Frontend | D3.js v7 |

---

## Project Structure

```
src/main/java/de/lecturebase/
├── ingestion/       # DocumentParser, TextChunker, IngestionService
├── storage/         # ChunkRepository, ConceptRepository, DatabaseConfig
├── ai/              # ClaudeClient, ChunkScorer, RagService
│                    # ConceptExtractor, GraphBuilder, MindMapService
└── api/             # REST controllers
src/main/resources/
└── static/index.html  # D3.js mind map visualization
```

---

## Requirements

- Java 21
- Maven 3.x
- An Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

**Install on macOS:**
```bash
brew install openjdk@21 maven
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/milkamilch/UniMind.git
cd UniMind

# 2. Set API key
export CLAUDE_API_KEY=sk-ant-...

# 3. Build & run
mvn spring-boot:run
```

The app starts on **http://localhost:8080**

---

## API Reference

### Upload a document
```bash
POST /api/upload
Content-Type: multipart/form-data

curl -X POST http://localhost:8080/api/upload -F "file=@lecture.pdf"
```
```json
{ "documentId": 1, "name": "lecture.pdf", "pages": 42, "chunks": 87 }
```

### List documents
```bash
GET /api/documents
```

### Keyword search
```bash
GET /api/search?q=quicksort
```

### Ask a question (RAG)
```bash
POST /api/ask
Content-Type: application/json

curl -X POST http://localhost:8080/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the difference between Quicksort and Mergesort?"}'
```
```json
{
  "answer": "Quicksort uses a pivot element...",
  "sources": [
    { "documentId": 1, "page": 14, "relevance": 0.85 }
  ]
}
```

### Build mind map
```bash
# All documents
POST /api/mindmap/build

# Specific document
POST /api/mindmap/build?documentId=1
```

### Get graph data (used by frontend)
```bash
GET /api/mindmap
```

---

## How It Works

### RAG Pipeline (Q&A)
```
Question → findCandidates() [SQL LIKE pre-filter]
         → ChunkScorer [keyword overlap ranking]
         → Top 5 chunks → Claude Haiku
         → Answer + source references
```

### Mind Map Pipeline
```
Chunks → Claude extracts 3–7 key concepts per chunk
       → Concepts stored in SQLite (nodes)
       → Co-occurring concepts linked (edges, weight = frequency)
       → D3.js renders interactive force-directed graph
```

---

## Running Tests

```bash
mvn test
```

Tests use an in-memory SQLite database and Mockito for Claude API mocking — no API key required.

---

## Configuration

`src/main/resources/application.properties`

| Property | Default | Description |
|---|---|---|
| `CLAUDE_API_KEY` | *(required)* | Anthropic API key (env variable) |
| `claude.api.base-url` | `https://api.anthropic.com` | Override for testing |
| `server.port` | `8080` | HTTP port |
| `spring.servlet.multipart.max-file-size` | `100MB` | Max upload size |
