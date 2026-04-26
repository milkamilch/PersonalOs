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

    private final ChunkRepository   repository;
    private final ChunkScorer       scorer;
    private final ClaudeClient      claudeClient;
    private final ChatSessionStore  sessionStore;

    public RagService(ChunkRepository repository, ChunkScorer scorer,
                      ClaudeClient claudeClient, ChatSessionStore sessionStore) {
        this.repository   = repository;
        this.scorer       = scorer;
        this.claudeClient = claudeClient;
        this.sessionStore = sessionStore;
    }

    public AskResponse ask(String question, String tag) {
        return ask(question, tag, null);
    }

    public AskResponse ask(String question, String tag, String sessionId) {
        List<Chunk> candidates = repository.findCandidates(question, tag);
        List<ChunkScorer.ScoredChunk> topChunks = scorer.score(question, candidates)
                .stream().limit(TOP_K).toList();

        if (topChunks.isEmpty()) {
            return new AskResponse(
                    "Keine passenden Inhalte in deinen Skripten gefunden.",
                    List.of(), sessionId
            );
        }

        ChatSession session = sessionId != null
                ? sessionStore.getOrCreate(sessionId)
                : sessionStore.createNew();

        String context       = buildContext(topChunks);
        String userMessage   = "Kontext:\n" + context + "\n\nFrage: " + question;
        String answer        = claudeClient.askWithHistory(SYSTEM_PROMPT, session.getHistory(), userMessage);

        session.add("user",      userMessage);
        session.add("assistant", answer);

        List<Source> sources = topChunks.stream()
                .map(sc -> new Source(sc.chunk().getDocumentId(), sc.chunk().getPageNumber(), sc.score()))
                .toList();

        return new AskResponse(answer, sources, session.getSessionId());
    }

    private String buildContext(List<ChunkScorer.ScoredChunk> chunks) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            Chunk c = chunks.get(i).chunk();
            sb.append("[%d] Seite %d:%n%s%n%n".formatted(i + 1, c.getPageNumber(), c.getText()));
        }
        return sb.toString();
    }

    public record AskResponse(String answer, List<Source> sources, String sessionId) {}
    public record Source(long documentId, int page, double relevance) {}
}
