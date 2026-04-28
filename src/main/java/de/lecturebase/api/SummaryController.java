package de.lecturebase.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.ai.SummaryService;
import de.lecturebase.storage.SummaryRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/summaries")
public class SummaryController {

    private final SummaryService    summaryService;
    private final SummaryRepository summaryRepository;
    private final ObjectMapper      objectMapper;

    public SummaryController(SummaryService summaryService,
                             SummaryRepository summaryRepository,
                             ObjectMapper objectMapper) {
        this.summaryService    = summaryService;
        this.summaryRepository = summaryRepository;
        this.objectMapper      = objectMapper;
    }

    /** Generiert eine Zusammenfassung für ein Dokument und speichert sie. */
    @PostMapping("/generate")
    public SummaryService.SummaryResult generate(
            @RequestParam long documentId,
            @RequestParam(defaultValue = "false") boolean rebuild) {
        return summaryService.generateForDocument(documentId, rebuild);
    }

    @GetMapping(value = "/generate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generateStream(
            @RequestParam long documentId,
            @RequestParam(defaultValue = "false") boolean rebuild) {
        SseEmitter emitter = new SseEmitter(300_000L);
        CompletableFuture.runAsync(() -> {
            try {
                SummaryService.SummaryResult result = summaryService.generateForDocument(documentId, rebuild, progress -> {
                    try {
                        emitter.send(SseEmitter.event()
                                .name("progress")
                                .data(objectMapper.writeValueAsString(progress)));
                    } catch (IOException e) { throw new RuntimeException(e); }
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

    @GetMapping("/{documentId}")
    public ResponseEntity<String> get(@PathVariable long documentId) {
        return summaryRepository.findByDocument(documentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
