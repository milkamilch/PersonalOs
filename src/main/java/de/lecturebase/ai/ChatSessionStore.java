package de.lecturebase.ai;

import de.lecturebase.storage.ChatSessionRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatSessionStore {

    private final Map<String, ChatSession>  sessions = new ConcurrentHashMap<>();
    private final ChatSessionRepository     repo;

    public ChatSessionStore(ChatSessionRepository repo) {
        this.repo = repo;
    }

    public ChatSession getOrCreate(String sessionId) {
        return sessions.computeIfAbsent(sessionId, id -> {
            ChatSession s = new ChatSession(id);
            List<ChatSession.Message> msgs = repo.loadMessages(id);
            msgs.forEach(m -> s.add(m.role(), m.content()));
            return s;
        });
    }

    public ChatSession createNew() {
        String id = UUID.randomUUID().toString();
        repo.ensureSession(id);
        ChatSession session = new ChatSession(id);
        sessions.put(id, session);
        return session;
    }

    public void addMessage(String sessionId, String role, String content) {
        getOrCreate(sessionId).add(role, content);
        repo.saveMessage(sessionId, role, content);
    }

    public List<String> listSessionIds() {
        return repo.loadAllSessionIds();
    }

    public void remove(String sessionId) {
        sessions.remove(sessionId);
        repo.deleteSession(sessionId);
    }

    public int size() {
        return sessions.size();
    }
}
