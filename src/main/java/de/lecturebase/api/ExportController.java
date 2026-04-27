package de.lecturebase.api;

import de.lecturebase.ai.ChatSession;
import de.lecturebase.ai.ChatSessionStore;
import de.lecturebase.model.Document;
import de.lecturebase.model.Flashcard;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.FlashcardRepository;
import de.lecturebase.storage.SummaryRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ChatSessionStore    sessionStore;
    private final FlashcardRepository flashcardRepository;
    private final SummaryRepository   summaryRepository;
    private final ChunkRepository     chunkRepository;

    public ExportController(ChatSessionStore sessionStore,
                            FlashcardRepository flashcardRepository,
                            SummaryRepository summaryRepository,
                            ChunkRepository chunkRepository) {
        this.sessionStore        = sessionStore;
        this.flashcardRepository = flashcardRepository;
        this.summaryRepository   = summaryRepository;
        this.chunkRepository     = chunkRepository;
    }

    /**
     * Exportiert den Gesprächsverlauf einer Session als Markdown oder Plaintext.
     * Format: ?format=markdown (Standard) oder ?format=txt
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<byte[]> export(
            @PathVariable String sessionId,
            @RequestParam(defaultValue = "markdown") String format) {

        ChatSession session = sessionStore.getOrCreate(sessionId);
        List<ChatSession.Message> history = session.getHistory();

        String content = "markdown".equalsIgnoreCase(format)
                ? renderMarkdown(sessionId, history)
                : renderPlaintext(sessionId, history);

        String filename = "unimind-export-%s.%s".formatted(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")),
            "markdown".equalsIgnoreCase(format) ? "md" : "txt"
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(content.getBytes(StandardCharsets.UTF_8));
    }

    private String renderMarkdown(String sessionId, List<ChatSession.Message> history) {
        StringBuilder sb = new StringBuilder();
        sb.append("# UniMind – Gesprächsexport\n\n");
        sb.append("**Session:** `").append(sessionId).append("`  \n");
        sb.append("**Exportiert:** ").append(LocalDateTime.now().format(
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))).append("\n\n---\n\n");

        for (ChatSession.Message msg : history) {
            if ("user".equals(msg.role())) {
                // Kontext-Block aus user-Nachrichten entfernen, nur die eigentliche Frage zeigen
                String question = extractQuestion(msg.content());
                sb.append("## Frage\n\n").append(question).append("\n\n");
            } else {
                sb.append("## Antwort\n\n").append(msg.content()).append("\n\n---\n\n");
            }
        }
        return sb.toString();
    }

    private String renderPlaintext(String sessionId, List<ChatSession.Message> history) {
        StringBuilder sb = new StringBuilder();
        sb.append("UniMind – Gesprächsexport\n");
        sb.append("Session: ").append(sessionId).append("\n");
        sb.append("Exportiert: ").append(LocalDateTime.now().format(
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))).append("\n");
        sb.append("=".repeat(60)).append("\n\n");

        for (ChatSession.Message msg : history) {
            if ("user".equals(msg.role())) {
                sb.append("FRAGE:\n").append(extractQuestion(msg.content())).append("\n\n");
            } else {
                sb.append("ANTWORT:\n").append(msg.content()).append("\n\n");
                sb.append("-".repeat(60)).append("\n\n");
            }
        }
        return sb.toString();
    }

    @GetMapping("/flashcards/{documentId}")
    public ResponseEntity<byte[]> exportFlashcards(@PathVariable long documentId) {
        List<Document> docs = chunkRepository.findAllDocuments();
        String docName = docs.stream()
                .filter(d -> d.getId() != null && d.getId() == documentId)
                .map(Document::getName)
                .findFirst().orElse("Dokument " + documentId);

        List<Flashcard> cards = flashcardRepository.findByDocument(documentId);
        StringBuilder sb = new StringBuilder();
        sb.append("# Lernkarten – ").append(docName).append("\n\n");
        sb.append("Exportiert: ").append(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))
        ).append("\n\n---\n\n");

        for (int i = 0; i < cards.size(); i++) {
            Flashcard c = cards.get(i);
            sb.append("## Karte ").append(i + 1).append("\n\n");
            sb.append("**Frage:** ").append(c.getQuestion()).append("\n\n");
            sb.append("**Antwort:** ").append(c.getAnswer()).append("\n\n");
            String status = c.getKnown() == null ? "–" : (c.getKnown() ? "✓ Gewusst" : "✕ Nicht gewusst");
            sb.append("*Status: ").append(status).append("*\n\n---\n\n");
        }

        String filename = "lernkarten-%s.md".formatted(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/summary/{documentId}")
    public ResponseEntity<byte[]> exportSummary(@PathVariable long documentId) {
        List<Document> docs = chunkRepository.findAllDocuments();
        String docName = docs.stream()
                .filter(d -> d.getId() != null && d.getId() == documentId)
                .map(Document::getName)
                .findFirst().orElse("Dokument " + documentId);

        String summary = summaryRepository.findByDocument(documentId)
                .orElse("Keine Zusammenfassung vorhanden.");

        StringBuilder sb = new StringBuilder();
        sb.append("# Zusammenfassung – ").append(docName).append("\n\n");
        sb.append("Exportiert: ").append(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))
        ).append("\n\n---\n\n").append(summary).append("\n");

        String filename = "zusammenfassung-%s.md".formatted(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    /** Extrahiert nur den Fragentext aus der kombinierten Kontext+Frage-Nachricht. */
    private String extractQuestion(String userMessage) {
        int idx = userMessage.lastIndexOf("Frage: ");
        return idx >= 0 ? userMessage.substring(idx + 7).trim() : userMessage;
    }
}
