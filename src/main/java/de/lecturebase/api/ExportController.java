package de.lecturebase.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.ai.AiClient;
import de.lecturebase.ai.ChatSession;
import de.lecturebase.ai.ChatSessionStore;
import de.lecturebase.model.Document;
import de.lecturebase.model.Flashcard;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.ConceptRepository;
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
import java.util.Map;

@RestController
@RequestMapping("/api/export")
public class ExportController {

    private final ChatSessionStore    sessionStore;
    private final FlashcardRepository flashcardRepository;
    private final SummaryRepository   summaryRepository;
    private final ChunkRepository     chunkRepository;
    private final ConceptRepository   conceptRepository;
    private final AiClient            aiClient;
    private final ObjectMapper        objectMapper;

    public ExportController(ChatSessionStore sessionStore,
                            FlashcardRepository flashcardRepository,
                            SummaryRepository summaryRepository,
                            ChunkRepository chunkRepository,
                            ConceptRepository conceptRepository,
                            AiClient aiClient,
                            ObjectMapper objectMapper) {
        this.sessionStore        = sessionStore;
        this.flashcardRepository = flashcardRepository;
        this.summaryRepository   = summaryRepository;
        this.chunkRepository     = chunkRepository;
        this.conceptRepository   = conceptRepository;
        this.aiClient            = aiClient;
        this.objectMapper        = objectMapper;
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
                .contentType(new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8))
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
                .contentType(new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8))
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
                .contentType(new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8))
                .body(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/glossary")
    public ResponseEntity<byte[]> exportGlossary(
            @RequestParam(required = false) Long documentId) {

        List<String> concepts = documentId != null
                ? conceptRepository.findNamesByDocument(documentId)
                : conceptRepository.findAllNodes().stream()
                        .map(ConceptRepository.ConceptNode::name).toList();

        if (concepts.isEmpty()) return ResponseEntity.noContent().build();

        String docName = documentId != null
                ? chunkRepository.findAllDocuments().stream()
                        .filter(d -> d.getId() != null && d.getId() == documentId)
                        .map(Document::getName).findFirst().orElse("Dokument " + documentId)
                : "Alle Dokumente";

        Map<String, String> explanations = fetchGlossaryExplanations(concepts);

        StringBuilder sb = new StringBuilder();
        sb.append("# Glossar – ").append(docName).append("\n\n");
        sb.append("Exportiert: ").append(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))
        ).append("\n\n---\n\n");

        char currentLetter = 0;
        for (String concept : concepts) {
            char letter = Character.toUpperCase(concept.charAt(0));
            if (letter != currentLetter) {
                sb.append("\n## ").append(letter).append("\n\n");
                currentLetter = letter;
            }
            sb.append("**").append(concept).append("**");
            String exp = explanations.getOrDefault(concept, "");
            if (!exp.isBlank()) sb.append(": ").append(exp);
            sb.append("\n\n");
        }

        String filename = "glossar-%s.md".formatted(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8))
                .body(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, String> fetchGlossaryExplanations(List<String> concepts) {
        Map<String, String> result = new java.util.LinkedHashMap<>();
        int batchSize = 20;
        for (int i = 0; i < concepts.size(); i += batchSize) {
            List<String> batch = concepts.subList(i, Math.min(i + batchSize, concepts.size()));
            String prompt = "Erkläre folgende Konzepte jeweils in einem kurzen Satz auf Deutsch.\n" +
                "Antworte NUR als JSON-Array: [{\"name\":\"...\",\"explanation\":\"...\"}]\n\n" +
                String.join(", ", batch);
            try {
                String json = aiClient.ask(
                    "Du bist ein präziser Lernassistent. Antworte ausschließlich mit validem JSON.", prompt);
                int start = json.indexOf('[');
                int end   = json.lastIndexOf(']') + 1;
                if (start >= 0 && end > start) {
                    List<Map<String, String>> items = objectMapper.readValue(
                        json.substring(start, end), new com.fasterxml.jackson.core.type.TypeReference<>() {});
                    items.forEach(m -> result.put(m.get("name"), m.getOrDefault("explanation", "")));
                }
            } catch (Exception ignored) {}
        }
        return result;
    }

    /** Extrahiert nur den Fragentext aus der kombinierten Kontext+Frage-Nachricht. */
    private String extractQuestion(String userMessage) {
        int idx = userMessage.lastIndexOf("Frage: ");
        return idx >= 0 ? userMessage.substring(idx + 7).trim() : userMessage;
    }
}
