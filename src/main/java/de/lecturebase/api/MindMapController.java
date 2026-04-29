package de.lecturebase.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.ai.AiClient;
import de.lecturebase.ai.ChatSession;
import de.lecturebase.ai.MindMapService;
import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/mindmap")
public class MindMapController {

    private final MindMapService  mindMapService;
    private final ObjectMapper    objectMapper;
    private final AiClient        aiClient;
    private final ChunkRepository chunkRepo;

    public MindMapController(MindMapService mindMapService,
                             ObjectMapper objectMapper,
                             AiClient aiClient,
                             ChunkRepository chunkRepo) {
        this.mindMapService = mindMapService;
        this.objectMapper   = objectMapper;
        this.aiClient       = aiClient;
        this.chunkRepo      = chunkRepo;
    }

    @PostMapping("/build")
    public MindMapService.BuildResult build(
            @RequestParam(required = false) Long documentId,
            @RequestParam(defaultValue = "false") boolean rebuild) {
        return mindMapService.build(documentId, rebuild);
    }

    @GetMapping(value = "/build-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter buildStream(
            @RequestParam(required = false) Long documentId,
            @RequestParam(defaultValue = "false") boolean rebuild) {

        SseEmitter emitter = new SseEmitter(300_000L);

        CompletableFuture.runAsync(() -> {
            try {
                MindMapService.BuildResult result = mindMapService.build(documentId, rebuild, progress -> {
                    try {
                        emitter.send(SseEmitter.event()
                                .name("progress")
                                .data(objectMapper.writeValueAsString(progress)));
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                });
                emitter.send(SseEmitter.event()
                        .name("done")
                        .data(objectMapper.writeValueAsString(result)));
                emitter.complete();
            } catch (Exception e) {
                try { emitter.send(SseEmitter.event().name("error").data(e.getMessage())); }
                catch (IOException ignored) {}
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    @GetMapping
    public MindMapService.GraphData getGraph() {
        return mindMapService.getGraphData();
    }

    @PostMapping("/quiz")
    public ResponseEntity<?> generateQuiz(@RequestBody List<String> concepts) {
        if (concepts == null || concepts.isEmpty()) return ResponseEntity.badRequest().build();
        String prompt = "Erstelle 5 Testfragen zu diesen Konzepten: " + String.join(", ", concepts) + "\n\n" +
            "Format: JSON-Array mit Objekten: " +
            "{\"question\":\"...\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"correct\":0,\"explanation\":\"...\"}\n" +
            "correct ist der Index der richtigen Antwort (0–3). Antworte NUR mit dem JSON-Array.";
        try {
            String json = aiClient.ask(
                "Du bist ein Prüfer. Erstelle präzise Multiple-Choice-Fragen auf Deutsch.", prompt);
            int start = json.indexOf('[');
            int end   = json.lastIndexOf(']') + 1;
            if (start < 0 || end <= start) return ResponseEntity.ok(List.of());
            List<Map<String, Object>> questions = objectMapper.readValue(
                json.substring(start, end), new TypeReference<>() {});
            return ResponseEntity.ok(questions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /** Chat with the context of a specific concept node */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> nodeChat(@RequestBody NodeChatRequest req) {
        // Find chunks that mention the concept
        List<Chunk> relevant = chunkRepo.findCandidates(req.concept())
                .stream().limit(5).collect(Collectors.toList());

        String context = relevant.isEmpty()
                ? "Kein spezifischer Kontext gefunden."
                : relevant.stream().map(Chunk::getText).collect(Collectors.joining("\n---\n"));

        String system = "Du bist ein präziser Lernassistent. Beantworte Fragen nur auf Basis " +
                "des folgenden Kontexts zum Konzept \"" + req.concept() + "\".\n\n" +
                "Kontext:\n" + context + "\n\n" +
                "Antworte auf Deutsch. Wenn die Antwort nicht im Kontext steht, sag das klar.";

        String reply = req.history() == null || req.history().isEmpty()
                ? aiClient.ask(system, req.message())
                : aiClient.askWithHistory(system, req.history(), req.message());

        return ResponseEntity.ok(Map.of("content", reply));
    }

    public record NodeChatRequest(
            String concept,
            String message,
            List<ChatSession.Message> history) {}

    @PostMapping("/explain")
    public Map<String, String> explain(@RequestParam String concept) {
        String answer = aiClient.ask(
            "Du bist ein präziser Lernassistent. Erkläre Konzepte klar und verständlich auf Deutsch. " +
            "Antworte in 3–5 Sätzen. Kein Begleittext, nur die Erklärung.",
            "Erkläre das Konzept: " + concept
        );
        return Map.of("explanation", answer);
    }
}
