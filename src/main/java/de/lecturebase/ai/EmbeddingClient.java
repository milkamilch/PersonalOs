package de.lecturebase.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class EmbeddingClient {

    private static final String MODEL      = "voyage-3-lite";
    private static final int    BATCH_SIZE = 50;

    private final RestClient restClient;
    private final boolean    enabled;

    public EmbeddingClient(
            @Value("${voyage.api.key:}") String apiKey,
            @Value("${voyage.api.base-url:https://api.voyageai.com}") String baseUrl) {
        this.enabled = apiKey != null && !apiKey.isBlank();
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + (enabled ? apiKey : "disabled"))
                .defaultHeader("content-type", "application/json")
                .build();
    }

    public boolean isEnabled() { return enabled; }

    public double[] embed(String text) {
        return embedBatch(List.of(text)).get(0);
    }

    /** Sendet Texte in Batches à BATCH_SIZE an die Voyage-API. */
    public List<double[]> embedBatch(List<String> texts) {
        if (!enabled) throw new IllegalStateException("Voyage API key nicht konfiguriert");

        java.util.List<double[]> results = new java.util.ArrayList<>();
        for (int i = 0; i < texts.size(); i += BATCH_SIZE) {
            List<String> batch = texts.subList(i, Math.min(i + BATCH_SIZE, texts.size()));
            results.addAll(callApi(batch));
        }
        return results;
    }

    @SuppressWarnings("unchecked")
    private List<double[]> callApi(List<String> texts) {
        Map<String, Object> body = Map.of("input", texts, "model", MODEL);

        Map<String, Object> response = restClient.post()
                .uri("/v1/embeddings")
                .body(body)
                .retrieve()
                .body(Map.class);

        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        return data.stream()
                .map(entry -> {
                    List<Number> raw = (List<Number>) entry.get("embedding");
                    return raw.stream().mapToDouble(Number::doubleValue).toArray();
                })
                .toList();
    }
}
