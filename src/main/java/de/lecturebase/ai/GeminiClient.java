package de.lecturebase.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class GeminiClient {

    private static final Logger log   = LoggerFactory.getLogger(GeminiClient.class);
    private static final String MODEL = "gemini-2.0-flash";
    private static final int    MAX_RETRIES       = 2;
    private static final long   MAX_AUTO_WAIT_MS  = 35_000;
    private static final Pattern RETRY_DELAY_PATTERN =
            Pattern.compile("retry in (\\d+(?:\\.\\d+)?)s");

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
        List<Map<String, Object>> contents = buildContents(history, userMessage);

        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", contents
        );

        String uri = "/v1beta/models/" + MODEL + ":generateContent?key=" + apiKey;

        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> response = restClient.post()
                        .uri(uri)
                        .body(body)
                        .retrieve()
                        .body(Map.class);
                return extractText(response);

            } catch (HttpClientErrorException.TooManyRequests e) {
                long waitMs = parseRetryDelay(e.getResponseBodyAsString());
                if (attempt < MAX_RETRIES && waitMs > 0 && waitMs <= MAX_AUTO_WAIT_MS) {
                    log.warn("Gemini rate-limit – warte {}ms (Versuch {}/{})", waitMs, attempt + 1, MAX_RETRIES);
                    try { Thread.sleep(waitMs + 1000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                } else {
                    long retrySec = waitMs > 0 ? waitMs / 1000 : 60;
                    throw new RateLimitException("Gemini Rate-Limit erreicht. Bitte in ca. " + retrySec + " Sekunden erneut versuchen.", retrySec);
                }
            }
        }
        throw new RateLimitException("Gemini Rate-Limit: Zu viele Anfragen.", 60);
    }

    private List<Map<String, Object>> buildContents(List<ChatSession.Message> history, String userMessage) {
        List<Map<String, Object>> contents = new ArrayList<>();
        for (ChatSession.Message m : history) {
            String role = m.role().equals("assistant") ? "model" : "user";
            contents.add(Map.of("role", role, "parts", List.of(Map.of("text", m.content()))));
        }
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage))));
        return contents;
    }

    private long parseRetryDelay(String errorBody) {
        if (errorBody == null) return 0;
        Matcher m = RETRY_DELAY_PATTERN.matcher(errorBody);
        if (m.find()) {
            return (long) (Double.parseDouble(m.group(1)) * 1000);
        }
        return 0;
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }
}
