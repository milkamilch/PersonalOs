package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.SummaryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SummaryService {

    private static final String SYSTEM_PROMPT = """
            Erstelle eine präzise Zusammenfassung des folgenden Vorlesungstexts auf Deutsch.
            - 3–5 Absätze
            - Wichtige Konzepte und Kernaussagen hervorheben
            - Kein Begleittext vor oder nach der Zusammenfassung
            """;

    static final int MAX_CHUNKS = 15;

    private final AiClient          claudeClient;
    private final ChunkRepository   chunkRepository;
    private final SummaryRepository summaryRepository;

    public SummaryService(AiClient claudeClient,
                          ChunkRepository chunkRepository,
                          SummaryRepository summaryRepository) {
        this.claudeClient      = claudeClient;
        this.chunkRepository   = chunkRepository;
        this.summaryRepository = summaryRepository;
    }

    public SummaryResult generateForDocument(long documentId, boolean rebuild) {
        if (!rebuild) {
            return summaryRepository.findByDocument(documentId)
                    .map(cached -> new SummaryResult(documentId, cached, false))
                    .orElseGet(() -> generate(documentId));
        }
        return generate(documentId);
    }

    private SummaryResult generate(long documentId) {
        List<Chunk> chunks = chunkRepository.findChunksByDocument(documentId);
        if (chunks.isEmpty()) return new SummaryResult(documentId, "", false);

        String context = chunks.stream()
                .limit(MAX_CHUNKS)
                .map(Chunk::getText)
                .collect(Collectors.joining("\n\n---\n\n"));

        String summary = claudeClient.ask(SYSTEM_PROMPT, context);
        summaryRepository.save(documentId, summary);
        return new SummaryResult(documentId, summary, true);
    }

    public record SummaryResult(long documentId, String summary, boolean generated) {}
}
