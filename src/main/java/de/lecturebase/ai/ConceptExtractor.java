package de.lecturebase.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ConceptExtractor {

    static final int BATCH_SIZE = 4;

    private static final String SYSTEM_PROMPT = """
            Du erhältst mehrere Textabschnitte, getrennt durch "=== ABSCHNITT N ===".
            Extrahiere für JEDEN Abschnitt separat 3 bis 7 wichtige Fachbegriffe.
            Antworte NUR mit einem JSON-Array von Arrays – eines pro Abschnitt:
            [["Begriff1","Begriff2"],["Begriff3","Begriff4","Begriff5"]]
            Regeln:
            - Nur Substantive und Fachterminologie
            - Kein Begleittext, nur das JSON-Array
            """;

    private final AiClient     claudeClient;
    private final ObjectMapper objectMapper;

    public ConceptExtractor(AiClient claudeClient, ObjectMapper objectMapper) {
        this.claudeClient = claudeClient;
        this.objectMapper = objectMapper;
    }

    /** Extracts concepts from multiple chunks in a single API call. */
    public List<List<String>> extractBatch(List<String> chunkTexts) {
        if (chunkTexts.isEmpty()) return List.of();

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < chunkTexts.size(); i++) {
            sb.append("=== ABSCHNITT ").append(i + 1).append(" ===\n");
            sb.append(chunkTexts.get(i)).append("\n\n");
        }

        int maxTokens = 100 + chunkTexts.size() * 60;
        String response = claudeClient.ask(SYSTEM_PROMPT, sb.toString(), maxTokens);
        List<List<String>> result = parseNestedJsonArray(response);

        // Pad with empty lists if Claude returned fewer arrays than chunks
        List<List<String>> padded = new ArrayList<>(result);
        while (padded.size() < chunkTexts.size()) padded.add(List.of());
        return padded;
    }

    List<List<String>> parseNestedJsonArray(String response) {
        int start = response.indexOf('[');
        int end   = response.lastIndexOf(']');
        if (start < 0 || end <= start) return List.of();
        try {
            return objectMapper.readValue(
                response.substring(start, end + 1),
                new TypeReference<List<List<String>>>() {}
            );
        } catch (Exception e) {
            return List.of();
        }
    }
}
