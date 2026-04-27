package de.lecturebase.api;

import de.lecturebase.ai.ChatSession;
import de.lecturebase.ai.ChatSessionStore;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatSessionStore sessionStore;

    public ChatController(ChatSessionStore sessionStore) {
        this.sessionStore = sessionStore;
    }

    @GetMapping("/sessions")
    public List<String> listSessions() {
        return sessionStore.listSessionIds();
    }

    @GetMapping("/sessions/{id}/messages")
    public List<ChatSession.Message> messages(@PathVariable String id) {
        return sessionStore.getOrCreate(id).getHistory();
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Map<String, String>> deleteSession(@PathVariable String id) {
        sessionStore.remove(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
