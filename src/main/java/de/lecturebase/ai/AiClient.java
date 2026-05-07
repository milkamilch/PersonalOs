package de.lecturebase.ai;

import java.util.List;
import java.util.function.Consumer;

public interface AiClient {
    String ask(String systemPrompt, String userMessage);
    String ask(String systemPrompt, String userMessage, int maxTokens);
    String askWithHistory(String systemPrompt, List<ChatSession.Message> history, String userMessage);
    void streamWithHistory(String systemPrompt, List<ChatSession.Message> history,
                           String userMessage, Consumer<String> onToken, Runnable onDone);
}
