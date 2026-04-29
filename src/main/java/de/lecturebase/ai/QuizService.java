package de.lecturebase.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class QuizService {

    private static final String GEN_SYSTEM = """
            Du bist ein Hochschul-Prüfer. Erstelle aus dem gegebenen Textabschnitt eine anspruchsvolle,
            offene Prüfungsfrage auf Deutsch. Die Frage soll Verständnis testen, nicht bloßes Auswendiglernen.
            Antworte NUR mit validem JSON (kein Markdown):
            {"question":"...", "pageHint": <Seitenzahl als Integer oder null>}
            """;

    private static final String EVAL_SYSTEM = """
            Du bist ein Hochschul-Korrektor. Bewerte die Antwort eines Studierenden auf eine Prüfungsfrage.
            Nutze den Referenztext als Grundlage. Sei fair aber anspruchsvoll (Maßstab: Universitätsprüfung).
            Antworte NUR mit validem JSON (kein Markdown):
            {"score":5,"maxScore":10,"feedback":"...","modelAnswer":"..."}
            score muss eine ganze Zahl von 0 bis maxScore sein. Schreibe feedback und modelAnswer auf Deutsch.
            """;

    private final ChunkRepository chunkRepo;
    private final AiClient aiClient;
    private final ObjectMapper mapper;

    public QuizService(ChunkRepository chunkRepo, AiClient aiClient, ObjectMapper mapper) {
        this.chunkRepo = chunkRepo;
        this.aiClient  = aiClient;
        this.mapper    = mapper;
    }

    public List<Map<String, Object>> generateQuestions(long documentId, int count) {
        List<Chunk> chunks = chunkRepo.findByDocument(documentId, count * 2);
        List<Map<String, Object>> questions = new ArrayList<>();

        for (Chunk chunk : chunks) {
            if (questions.size() >= count) break;
            try {
                String raw = aiClient.ask(GEN_SYSTEM,
                        "Textabschnitt (Seite " + chunk.getPageNumber() + "):\n" + chunk.getText(), 400);
                String json = extractJson(raw);
                @SuppressWarnings("unchecked")
                Map<String, Object> q = mapper.readValue(json, Map.class);
                q.put("chunkContext", chunk.getText());
                q.put("chunkId", chunk.getId());
                questions.add(q);
            } catch (Exception ignored) {
                // skip malformed AI responses
            }
        }
        return questions;
    }

    public Map<String, Object> evaluate(String question, String chunkContext, String userAnswer) {
        String prompt = "Frage: " + question + "\n\nReferenztext:\n" + chunkContext
                + "\n\nStudenten-Antwort:\n" + userAnswer;
        try {
            String raw = aiClient.ask(EVAL_SYSTEM, prompt, 800);
            String json = extractJson(raw);
            @SuppressWarnings("unchecked")
            Map<String, Object> result = mapper.readValue(json, Map.class);
            return result;
        } catch (Exception e) {
            return Map.of(
                "score", 0, "maxScore", 10,
                "feedback", "Auswertung fehlgeschlagen: " + e.getMessage(),
                "modelAnswer", ""
            );
        }
    }

    private String extractJson(String raw) {
        int start = raw.indexOf('{');
        int end   = raw.lastIndexOf('}');
        if (start >= 0 && end > start) return raw.substring(start, end + 1);
        return raw;
    }
}
