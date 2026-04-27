package de.lecturebase.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.ai.AiClient;
import de.lecturebase.ai.MindMapService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/mindmap")
public class MindMapController {

    private final MindMapService mindMapService;
    private final ObjectMapper   objectMapper;
    private final AiClient       aiClient;

    public MindMapController(MindMapService mindMapService,
                             ObjectMapper objectMapper,
                             AiClient aiClient) {
        this.mindMapService = mindMapService;
        this.objectMapper   = objectMapper;
        this.aiClient       = aiClient;
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
