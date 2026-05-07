package de.lecturebase.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

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

    private final ChunkRepository       repository;
    private final ChunkScorer           scorer;
    private final AiClient              claudeClient;
    private final ChatSessionStore      sessionStore;
    private final SemanticSearchService semanticSearch;
    private final ObjectMapper          mapper;

    public RagService(ChunkRepository repository, ChunkScorer scorer,
                      AiClient claudeClient, ChatSessionStore sessionStore,
                      SemanticSearchService semanticSearch,
                      ObjectMapper mapper) {
        this.repository     = repository;
        this.scorer         = scorer;
        this.claudeClient   = claudeClient;
        this.sessionStore   = sessionStore;
        this.semanticSearch = semanticSearch;
        this.mapper         = mapper;
    }

    public AskResponse ask(String question, String tag) {
        return ask(question, tag, null);
    }

    public AskResponse ask(String question, String tag, String sessionId) {
        List<Chunk> topChunks = semanticSearch.isAvailable()
                ? semanticSearch.findSimilar(question, TOP_K, tag)
                : keywordTopChunks(question, tag);

        if (topChunks.isEmpty()) {
            return new AskResponse(
                    "Keine passenden Inhalte in deinen Skripten gefunden.",
                    List.of(), sessionId
            );
        }

        ChatSession session = sessionId != null
                ? sessionStore.getOrCreate(sessionId)
                : sessionStore.createNew();

        String context     = buildContext(topChunks);
        String userMessage = "Kontext:\n" + context + "\n\nFrage: " + question;
        String answer      = claudeClient.askWithHistory(SYSTEM_PROMPT, session.getHistory(), userMessage);

        sessionStore.addMessage(session.getSessionId(), "user",      userMessage);
        sessionStore.addMessage(session.getSessionId(), "assistant", answer);

        List<Source> sources = topChunks.stream()
                .map(c -> new Source(c.getDocumentId(), c.getPageNumber(), 1.0))
                .toList();

        return new AskResponse(answer, sources, session.getSessionId());
    }

    public void askStream(String question, String tag, String sessionId, SseEmitter emitter) {
        List<Chunk> topChunks = semanticSearch.isAvailable()
                ? semanticSearch.findSimilar(question, TOP_K, tag)
                : keywordTopChunks(question, tag);

        if (topChunks.isEmpty()) {
            try {
                emitter.send(mapper.writeValueAsString(Map.of(
                        "type", "token", "text", "Keine passenden Inhalte in deinen Skripten gefunden.")));
                emitter.send(mapper.writeValueAsString(Map.of("type", "done", "sessionId", "", "sources", List.of())));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return;
        }

        ChatSession session = sessionId != null && !sessionId.isBlank()
                ? sessionStore.getOrCreate(sessionId)
                : sessionStore.createNew();

        String context     = buildContext(topChunks);
        String userMessage = "Kontext:\n" + context + "\n\nFrage: " + question;
        List<Source> sources = topChunks.stream()
                .map(c -> new Source(c.getDocumentId(), c.getPageNumber(), 1.0))
                .toList();

        StringBuilder fullAnswer = new StringBuilder();

        claudeClient.streamWithHistory(SYSTEM_PROMPT, session.getHistory(), userMessage,
                token -> {
                    fullAnswer.append(token);
                    try {
                        emitter.send(mapper.writeValueAsString(Map.of("type", "token", "text", token)));
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                },
                () -> {
                    String answer = fullAnswer.toString();
                    sessionStore.addMessage(session.getSessionId(), "user",      userMessage);
                    sessionStore.addMessage(session.getSessionId(), "assistant", answer);
                    try {
                        emitter.send(mapper.writeValueAsString(Map.of(
                                "type",      "done",
                                "sessionId", session.getSessionId(),
                                "sources",   sources)));
                        emitter.complete();
                    } catch (Exception e) {
                        emitter.completeWithError(e);
                    }
                });
    }

    private List<Chunk> keywordTopChunks(String question, String tag) {
        List<Chunk> candidates = repository.findCandidates(question, tag);
        return scorer.score(question, candidates)
                .stream().limit(TOP_K)
                .map(ChunkScorer.ScoredChunk::chunk)
                .toList();
    }

    private String buildContext(List<Chunk> chunks) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            Chunk c = chunks.get(i);
            sb.append("[%d] Seite %d:%n%s%n%n".formatted(i + 1, c.getPageNumber(), c.getText()));
        }
        return sb.toString();
    }

    public record AskResponse(String answer, List<Source> sources, String sessionId) {}
    public record Source(long documentId, int page, double relevance) {}
}
