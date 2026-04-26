package de.lecturebase.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.model.Chunk;
import de.lecturebase.model.Flashcard;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.FlashcardRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FlashcardGenerator {

    private static final String SYSTEM_PROMPT = """
            Erstelle 3–5 Lernkarten aus dem folgenden Vorlesungstext.
            Antworte NUR mit einem JSON-Array, Beispiel:
            [{"question": "Was ist Quicksort?", "answer": "Ein rekursiver Sortieralgorithmus..."}]
            - Fragen sollen Verständnis prüfen, nicht reines Auswendiglernen
            - Antworten präzise und vollständig (2–4 Sätze)
            - Kein Begleittext, nur das JSON-Array
            """;

    private final ClaudeClient        claudeClient;
    private final ChunkRepository     chunkRepository;
    private final FlashcardRepository flashcardRepository;
    private final ObjectMapper        objectMapper;

    public FlashcardGenerator(ClaudeClient claudeClient,
                               ChunkRepository chunkRepository,
                               FlashcardRepository flashcardRepository,
                               ObjectMapper objectMapper) {
        this.claudeClient        = claudeClient;
        this.chunkRepository     = chunkRepository;
        this.flashcardRepository = flashcardRepository;
        this.objectMapper        = objectMapper;
    }

    /** Generiert Flashcards für alle Chunks eines Dokuments und speichert sie. */
    public GenerateResult generateForDocument(long documentId) {
        List<Chunk> chunks = chunkRepository.findChunksByDocument(documentId);
        int created = 0;

        for (Chunk chunk : chunks) {
            List<RawCard> cards = extractCards(chunk.getText());
            for (RawCard card : cards) {
                Flashcard fc = new Flashcard();
                fc.setDocumentId(documentId);
                fc.setChunkId(chunk.getId());
                fc.setQuestion(card.question());
                fc.setAnswer(card.answer());
                flashcardRepository.save(fc);
                created++;
            }
        }
        return new GenerateResult(chunks.size(), created);
    }

    List<RawCard> extractCards(String text) {
        String response = claudeClient.ask(SYSTEM_PROMPT, text);
        return parseJson(response);
    }

    List<RawCard> parseJson(String response) {
        int start = response.indexOf('[');
        int end   = response.lastIndexOf(']');
        if (start < 0 || end <= start) return List.of();
        try {
            return objectMapper.readValue(
                response.substring(start, end + 1),
                new TypeReference<List<RawCard>>() {}
            );
        } catch (Exception e) {
            return List.of();
        }
    }

    public record RawCard(String question, String answer) {}
    public record GenerateResult(int processedChunks, int createdCards) {}
}
