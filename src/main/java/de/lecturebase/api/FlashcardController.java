package de.lecturebase.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.ai.FlashcardGenerator;
import de.lecturebase.model.Flashcard;
import de.lecturebase.storage.FlashcardRepository;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/flashcards")
public class FlashcardController {

    private final FlashcardGenerator  generator;
    private final FlashcardRepository repository;
    private final ObjectMapper        objectMapper;

    public FlashcardController(FlashcardGenerator generator,
                                FlashcardRepository repository,
                                ObjectMapper objectMapper) {
        this.generator    = generator;
        this.repository   = repository;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/generate")
    public FlashcardGenerator.GenerateResult generate(@RequestParam long documentId) {
        repository.deleteByDocument(documentId);
        return generator.generateForDocument(documentId);
    }

    @GetMapping(value = "/generate-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generateStream(@RequestParam long documentId) {
        SseEmitter emitter = new SseEmitter(300_000L);
        repository.deleteByDocument(documentId);

        CompletableFuture.runAsync(() -> {
            try {
                FlashcardGenerator.GenerateResult result = generator.generateForDocument(documentId, progress -> {
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
    public List<Flashcard> list(@RequestParam(required = false) Long documentId) {
        return documentId != null ? repository.findByDocument(documentId) : repository.findAll();
    }

    @GetMapping("/due")
    public List<Flashcard> due(@RequestParam long documentId) {
        return repository.findDueByDocument(documentId);
    }

    @GetMapping("/due-counts")
    public Map<Long, Integer> dueCounts() {
        return repository.findDueCountsPerDocument();
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<de.lecturebase.model.Flashcard> rate(@PathVariable long id, @RequestParam boolean known) {
        de.lecturebase.model.Flashcard updated = repository.rate(id, known);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> reset(@RequestParam long documentId) {
        repository.resetRatings(documentId);
        return ResponseEntity.ok(Map.of("status", "reset"));
    }
}
