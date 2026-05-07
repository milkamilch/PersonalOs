package de.lecturebase.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Component
@Primary
public class ClaudeClient implements AiClient {

    private static final String MODEL          = "claude-haiku-4-5-20251001";
    private static final int    DEFAULT_TOKENS = 1024;

    private final RestClient   restClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public ClaudeClient(
            @Value("${claude.api.key}") String apiKey,
            @Value("${claude.api.base-url:https://api.anthropic.com}") String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("x-api-key",          apiKey)
                .defaultHeader("anthropic-version",  "2023-06-01")
                .defaultHeader("anthropic-beta",     "prompt-caching-2024-07-31")
                .defaultHeader("content-type",       "application/json")
                .build();
    }

    @Override
    public String ask(String systemPrompt, String userMessage) {
        return ask(systemPrompt, userMessage, DEFAULT_TOKENS);
    }

    @Override
    public String ask(String systemPrompt, String userMessage, int maxTokens) {
        return askWithHistory(systemPrompt, List.of(), userMessage, maxTokens);
    }

    @Override
    public String askWithHistory(String systemPrompt,
                                 List<ChatSession.Message> history,
                                 String userMessage) {
        return askWithHistory(systemPrompt, history, userMessage, DEFAULT_TOKENS);
    }

    @Override
    public void streamWithHistory(String systemPrompt,
                                  List<ChatSession.Message> history,
                                  String userMessage,
                                  Consumer<String> onToken,
                                  Runnable onDone) {
        List<Map<String, Object>> messages = buildMessages(history, userMessage);
        Map<String, Object> body = buildBody(systemPrompt, messages, DEFAULT_TOKENS, true);

        restClient.post()
                .uri("/v1/messages")
                .header("Accept", "text/event-stream")
                .body(body)
                .<Void>exchange((req, res) -> {
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(res.getBody(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (!line.startsWith("data: ")) continue;
                            String json = line.substring(6).trim();
                            if (json.isEmpty() || "[DONE]".equals(json)) continue;
                            try {
                                JsonNode node = mapper.readTree(json);
                                if ("content_block_delta".equals(node.path("type").asText())) {
                                    JsonNode delta = node.path("delta");
                                    if ("text_delta".equals(delta.path("type").asText())) {
                                        String text = delta.path("text").asText();
                                        if (!text.isEmpty()) onToken.accept(text);
                                    }
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                    onDone.run();
                    return null;
                });
    }

    private String askWithHistory(String systemPrompt,
                                  List<ChatSession.Message> history,
                                  String userMessage,
                                  int maxTokens) {
        List<Map<String, Object>> messages = buildMessages(history, userMessage);
        Map<String, Object> body = buildBody(systemPrompt, messages, maxTokens, false);

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/v1/messages")
                .body(body)
                .retrieve()
                .body(Map.class);

        return extractText(response);
    }

    private List<Map<String, Object>> buildMessages(List<ChatSession.Message> history,
                                                     String userMessage) {
        List<Map<String, Object>> messages = new ArrayList<>();
        history.forEach(m -> messages.add(Map.of("role", m.role(), "content", m.content())));
        messages.add(Map.of("role", "user", "content", userMessage));
        return messages;
    }

    private Map<String, Object> buildBody(String systemPrompt,
                                           List<Map<String, Object>> messages,
                                           int maxTokens,
                                           boolean stream) {
        List<Map<String, Object>> systemBlocks = List.of(Map.of(
                "type",          "text",
                "text",          systemPrompt,
                "cache_control", Map.of("type", "ephemeral")
        ));

        Map<String, Object> body = new HashMap<>();
        body.put("model",      MODEL);
        body.put("max_tokens", maxTokens);
        body.put("system",     systemBlocks);
        body.put("messages",   messages);
        if (stream) body.put("stream", true);
        return body;
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
        return (String) content.get(0).get("text");
    }
}
