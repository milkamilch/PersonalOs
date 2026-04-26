package de.lecturebase.ai;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Hält die Nachrichtenhistorie einer Konversation im Speicher.
 * Wird pro sessionId von ChatSessionStore verwaltet.
 */
public class ChatSession {

    private static final int MAX_HISTORY = 10; // Nachrichten-Paare (user + assistant)

    private final String sessionId;
    private final List<Message> history = new ArrayList<>();

    public ChatSession(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getSessionId() { return sessionId; }

    public void add(String role, String content) {
        history.add(new Message(role, content));
        // Älteste Einträge entfernen wenn Limit überschritten (je 2 pro Runde = user+assistant)
        while (history.size() > MAX_HISTORY * 2) {
            history.remove(0);
        }
    }

    public List<Message> getHistory() {
        return Collections.unmodifiableList(history);
    }

    public record Message(String role, String content) {}
}
