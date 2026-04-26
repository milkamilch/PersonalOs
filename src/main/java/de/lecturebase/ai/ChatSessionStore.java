package de.lecturebase.ai;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatSessionStore {

    private final Map<String, ChatSession> sessions = new ConcurrentHashMap<>();

    public ChatSession getOrCreate(String sessionId) {
        return sessions.computeIfAbsent(sessionId, ChatSession::new);
    }

    public ChatSession createNew() {
        String id = UUID.randomUUID().toString();
        ChatSession session = new ChatSession(id);
        sessions.put(id, session);
        return session;
    }

    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }

    public int size() {
        return sessions.size();
    }
}
