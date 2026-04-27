package de.lecturebase.storage;

import de.lecturebase.ai.ChatSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ChatSessionRepository {

    private final JdbcTemplate jdbc;

    public ChatSessionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void ensureSession(String sessionId) {
        jdbc.update("INSERT OR IGNORE INTO chat_sessions (id) VALUES (?)", sessionId);
    }

    public void saveMessage(String sessionId, String role, String content) {
        ensureSession(sessionId);
        jdbc.update(
            "INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)",
            sessionId, role, content
        );
    }

    public List<ChatSession.Message> loadMessages(String sessionId) {
        return jdbc.query(
            "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id",
            (rs, row) -> new ChatSession.Message(rs.getString("role"), rs.getString("content")),
            sessionId
        );
    }

    public List<String> loadAllSessionIds() {
        return jdbc.query(
            "SELECT id FROM chat_sessions ORDER BY created_at DESC",
            (rs, row) -> rs.getString("id")
        );
    }

    public void deleteSession(String sessionId) {
        jdbc.update("DELETE FROM chat_messages WHERE session_id = ?", sessionId);
        jdbc.update("DELETE FROM chat_sessions WHERE id = ?", sessionId);
    }
}
