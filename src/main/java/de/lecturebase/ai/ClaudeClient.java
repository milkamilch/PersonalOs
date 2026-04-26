package de.lecturebase.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class ClaudeClient {

    private static final String MODEL      = "claude-haiku-4-5-20251001";
    private static final int    MAX_TOKENS = 1024;

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
        return askWithHistory(systemPrompt, List.of(), userMessage);
    }

    public String askWithHistory(String systemPrompt,
                                 List<ChatSession.Message> history,
                                 String userMessage) {
        List<Map<String, String>> messages = new java.util.ArrayList<>();
        history.forEach(m -> messages.add(Map.of("role", m.role(), "content", m.content())));
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> body = Map.of(
                "model",      MODEL,
                "max_tokens", MAX_TOKENS,
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
