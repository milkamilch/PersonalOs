package de.lecturebase.ai;

import java.util.List;

public interface AiClient {
    String ask(String systemPrompt, String userMessage);
    String ask(String systemPrompt, String userMessage, int maxTokens);
    String askWithHistory(String systemPrompt, List<ChatSession.Message> history, String userMessage);
}
