package de.lecturebase.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ConceptExtractor {

    private static final String SYSTEM_PROMPT = """
            Extrahiere die wichtigsten Fachbegriffe und Konzepte aus dem gegebenen Text.
            Antworte NUR mit einem JSON-Array aus Strings, Beispiel: ["Quicksort", "Rekursion", "Divide-and-Conquer"]
            Regeln:
            - Genau 3 bis 7 Begriffe
            - Nur Substantive und Fachterminologie
            - Kein Begleittext, nur das JSON-Array
            """;

    private final GeminiClient claudeClient;
    private final ObjectMapper objectMapper;

    public ConceptExtractor(GeminiClient claudeClient, ObjectMapper objectMapper) {
        this.claudeClient = claudeClient;
        this.objectMapper = objectMapper;
    }

    public List<String> extract(String chunkText) {
        String response = claudeClient.ask(SYSTEM_PROMPT, chunkText);
        return parseJsonArray(response);
    }

    List<String> parseJsonArray(String response) {
        int start = response.indexOf('[');
        int end   = response.lastIndexOf(']');
        if (start < 0 || end <= start) return List.of();
        try {
            return objectMapper.readValue(
                response.substring(start, end + 1),
                new TypeReference<List<String>>() {}
            );
        } catch (Exception e) {
            return List.of();
        }
    }
}
