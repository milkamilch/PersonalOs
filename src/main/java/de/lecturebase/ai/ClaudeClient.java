package de.lecturebase.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
@Primary
public class ClaudeClient implements AiClient {

    private static final String MODEL           = "claude-haiku-4-5-20251001";
    private static final int    DEFAULT_TOKENS  = 1024;

    private final RestClient restClient;

    public ClaudeClient(
            @Value("${claude.api.key}") String apiKey,
            @Value("${claude.api.base-url:https://api.anthropic.com}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader("content-type", "application/json")
                .build();
    }

    public String ask(String systemPrompt, String userMessage) {
        return ask(systemPrompt, userMessage, DEFAULT_TOKENS);
    }

    public String ask(String systemPrompt, String userMessage, int maxTokens) {
        return askWithHistory(systemPrompt, List.of(), userMessage, maxTokens);
    }

    public String askWithHistory(String systemPrompt,
                                 List<ChatSession.Message> history,
                                 String userMessage) {
        return askWithHistory(systemPrompt, history, userMessage, DEFAULT_TOKENS);
    }

    private String askWithHistory(String systemPrompt,
                                  List<ChatSession.Message> history,
                                  String userMessage,
                                  int maxTokens) {
        List<Map<String, String>> messages = new java.util.ArrayList<>();
        history.forEach(m -> messages.add(Map.of("role", m.role(), "content", m.content())));
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> body = Map.of(
                "model",      MODEL,
                "max_tokens", maxTokens,
                "system",     systemPrompt,
                "messages",   messages
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/v1/messages")
                .body(body)
                .retrieve()
                .body(Map.class);

        return extractText(response);
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
        return (String) content.get(0).get("text");
    }
}
