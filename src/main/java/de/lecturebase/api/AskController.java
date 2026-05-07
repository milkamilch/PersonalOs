package de.lecturebase.api;

import de.lecturebase.ai.RagService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
public class AskController {

    private final RagService ragService;

    public AskController(RagService ragService) {
        this.ragService = ragService;
    }

    @PostMapping("/ask")
    public RagService.AskResponse ask(@RequestBody AskRequest request) {
        return ragService.ask(request.question(), request.tag(), request.sessionId());
    }

    @PostMapping(value = "/ask/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter askStream(@RequestBody AskRequest request) {
        SseEmitter emitter = new SseEmitter(300_000L);
        Thread.ofVirtual().start(() -> {
            try {
                ragService.askStream(request.question(), request.tag(), request.sessionId(), emitter);
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    public record AskRequest(String question, String tag, String sessionId) {}
}
