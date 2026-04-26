package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RagService {

    private static final int TOP_K = 5;

    private static final String SYSTEM_PROMPT = """
            Du bist ein Studienassistent. Beantworte Fragen ausschließlich auf Basis der bereitgestellten Vorlesungsinhalte.
            Nenne am Ende deiner Antwort die Quellen im Format: [Seite X].
            Wenn die gesuchte Information nicht vorhanden ist, antworte mit:
            "Diese Information befindet sich nicht in deinen Vorlesungsskripten."
            Antworte auf Deutsch.
            """;

    private final ChunkRepository repository;
    private final ChunkScorer scorer;
    private final ClaudeClient claudeClient;

    public RagService(ChunkRepository repository, ChunkScorer scorer, ClaudeClient claudeClient) {
        this.repository   = repository;
        this.scorer       = scorer;
        this.claudeClient = claudeClient;
    }

    public AskResponse ask(String question) {
        List<Chunk> candidates = repository.findCandidates(question);
        List<ChunkScorer.ScoredChunk> topChunks = scorer.score(question, candidates)
                .stream().limit(TOP_K).toList();

        if (topChunks.isEmpty()) {
            return new AskResponse(
                    "Keine passenden Inhalte in deinen Skripten gefunden.",
                    List.of()
            );
        }

        String context = buildContext(topChunks);
        String answer  = claudeClient.ask(SYSTEM_PROMPT, "Kontext:\n" + context + "\n\nFrage: " + question);

        List<Source> sources = topChunks.stream()
                .map(sc -> new Source(sc.chunk().getDocumentId(), sc.chunk().getPageNumber(), sc.score()))
                .toList();

        return new AskResponse(answer, sources);
    }

    private String buildContext(List<ChunkScorer.ScoredChunk> chunks) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            Chunk c = chunks.get(i).chunk();
            sb.append("[%d] Seite %d:%n%s%n%n".formatted(i + 1, c.getPageNumber(), c.getText()));
        }
        return sb.toString();
    }

    public record AskResponse(String answer, List<Source> sources) {}
    public record Source(long documentId, int page, double relevance) {}
}
