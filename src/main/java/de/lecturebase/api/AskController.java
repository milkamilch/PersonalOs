package de.lecturebase.api;

import de.lecturebase.ai.RagService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AskController {

    private final RagService ragService;

    public AskController(RagService ragService) {
        this.ragService = ragService;
    }

    @PostMapping("/ask")
    public RagService.AskResponse ask(@RequestBody AskRequest request) {
        return ragService.ask(request.question());
    }

    public record AskRequest(String question) {}
}
