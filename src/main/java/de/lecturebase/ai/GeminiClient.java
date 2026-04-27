package de.lecturebase.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class GeminiClient {

    private static final String MODEL = "gemini-2.0-flash";

    private final RestClient restClient;
    private final String     apiKey;

    public GeminiClient(
            @Value("${gemini.api.key}") String apiKey,
            @Value("${gemini.api.base-url:https://generativelanguage.googleapis.com}") String baseUrl) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("content-type", "application/json")
                .build();
    }

    public String ask(String systemPrompt, String userMessage) {
        return askWithHistory(systemPrompt, List.of(), userMessage);
    }

    public String askWithHistory(String systemPrompt,
                                 List<ChatSession.Message> history,
                                 String userMessage) {
        List<Map<String, Object>> contents = new ArrayList<>();

        // Gesprächsverlauf – Gemini nutzt "model" statt "assistant"
        for (ChatSession.Message m : history) {
            String role = m.role().equals("assistant") ? "model" : "user";
            contents.add(Map.of("role", role, "parts", List.of(Map.of("text", m.content()))));
        }
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage))));

        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", contents
        );

        String uri = "/v1beta/models/" + MODEL + ":generateContent?key=" + apiKey;

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri(uri)
                .body(body)
                .retrieve()
                .body(Map.class);

        return extractText(response);
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }
}
