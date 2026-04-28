package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.SummaryRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
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

    private static final int BATCH_SIZE = 5;

    public SummaryResult generateForDocument(long documentId, boolean rebuild) {
        return generateForDocument(documentId, rebuild, null);
    }

    public SummaryResult generateForDocument(long documentId, boolean rebuild, Consumer<SummaryProgress> onProgress) {
        if (!rebuild) {
            return summaryRepository.findByDocument(documentId)
                    .map(cached -> {
                        if (onProgress != null) onProgress.accept(new SummaryProgress(1, 1, cached));
                        return new SummaryResult(documentId, cached, false);
                    })
                    .orElseGet(() -> generate(documentId, onProgress));
        }
        return generate(documentId, onProgress);
    }

    private SummaryResult generate(long documentId, Consumer<SummaryProgress> onProgress) {
        List<Chunk> chunks = chunkRepository.findChunksByDocument(documentId);
        if (chunks.isEmpty()) return new SummaryResult(documentId, "", false);

        List<String> texts = chunks.stream().limit(MAX_CHUNKS).map(Chunk::getText).toList();
        int total = (int) Math.ceil((double) texts.size() / BATCH_SIZE);

        List<String> partials = new ArrayList<>();
        for (int i = 0; i < total; i++) {
            List<String> batch = texts.subList(i * BATCH_SIZE, Math.min((i + 1) * BATCH_SIZE, texts.size()));
            String context = String.join("\n\n---\n\n", batch);
            String partial = claudeClient.ask(SYSTEM_PROMPT, context);
            partials.add(partial);
            if (onProgress != null) onProgress.accept(new SummaryProgress(i + 1, total, partial));
        }

        String summary = partials.size() == 1 ? partials.get(0)
                : claudeClient.ask("""
                    Fasse diese Teilzusammenfassungen zu einer einzigen kohärenten Zusammenfassung zusammen.
                    3–5 Absätze, kein Begleittext.
                    """, String.join("\n\n---\n\n", partials));

        summaryRepository.save(documentId, summary);
        return new SummaryResult(documentId, summary, true);
    }

    public record SummaryProgress(int batch, int totalBatches, String partial) {}
    public record SummaryResult(long documentId, String summary, boolean generated) {}
}
