package de.lecturebase.api;

import de.lecturebase.ai.ChatSession;
import de.lecturebase.ai.ChatSessionStore;
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

    private final ChatSessionStore sessionStore;

    public ExportController(ChatSessionStore sessionStore) {
        this.sessionStore = sessionStore;
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

    /** Extrahiert nur den Fragentext aus der kombinierten Kontext+Frage-Nachricht. */
    private String extractQuestion(String userMessage) {
        int idx = userMessage.lastIndexOf("Frage: ");
        return idx >= 0 ? userMessage.substring(idx + 7).trim() : userMessage;
    }
}
