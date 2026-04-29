package de.lecturebase.api;

import de.lecturebase.ai.AiClient;
import de.lecturebase.ai.ChatSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jarvis")
public class JArvisController {

    private static final String SYSTEM_PROMPT = """
            Du bist JArvis, ein intelligenter persönlicher Assistent.
            Du hilfst dem Nutzer mit Lernmaterialien, GitHub-Repositories, Server-Status und allgemeinen Fragen.
            Antworte immer auf Deutsch, präzise und freundlich.
            Halte Antworten kurz und klar, außer der Nutzer fragt nach Details.
            """;

    private final AiClient aiClient;

    public JArvisController(AiClient aiClient) {
        this.aiClient = aiClient;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody ChatRequest req) {
        List<ChatSession.Message> history = req.messages() == null ? List.of() : req.messages();
        String lastUser = history.isEmpty() ? "" : history.getLast().content();
        List<ChatSession.Message> previousHistory = history.size() > 1
                ? history.subList(0, history.size() - 1)
                : List.of();
        String reply = aiClient.askWithHistory(SYSTEM_PROMPT, previousHistory, lastUser);
        return ResponseEntity.ok(Map.of("content", reply));
    }

    public record ChatRequest(List<ChatSession.Message> messages) {}
}
