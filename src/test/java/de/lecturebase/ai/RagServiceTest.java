package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RagServiceTest {

    @Mock ChunkRepository       repository;
    @Mock ChunkScorer           scorer;
    @Mock GeminiClient          claudeClient;
    @Mock SemanticSearchService semanticSearch;
    @Mock ChatSessionStore      sessionStore;

    @InjectMocks RagService ragService;

    @BeforeEach
    void setup() {
        // Nutzt Keyword-Pfad (kein Voyage API Key in Tests)
        when(semanticSearch.isAvailable()).thenReturn(false);
        when(sessionStore.createNew()).thenReturn(new ChatSession("test-session"));
    }

    @Test
    void frageWirdAnClaudeWeitergegebenMitKontext() {
        Chunk c = chunk(1L, 2, "Quicksort teilt die Liste rekursiv auf");
        ChunkScorer.ScoredChunk scored = new ChunkScorer.ScoredChunk(c, 0.8);

        when(repository.findCandidates("quicksort", null)).thenReturn(List.of(c));
        when(scorer.score(anyString(), any())).thenReturn(List.of(scored));
        when(claudeClient.askWithHistory(anyString(), any(), anyString())).thenReturn("Quicksort ist ein Divide-and-Conquer-Algorithmus.");

        RagService.AskResponse response = ragService.ask("quicksort", null);

        assertThat(response.answer()).contains("Quicksort");
        assertThat(response.sources()).hasSize(1);
        assertThat(response.sources().get(0).page()).isEqualTo(2);
        verify(claudeClient).askWithHistory(anyString(), any(), anyString());
    }

    @Test
    void keineKandidatenLiefertFallbackAntwort() {
        when(repository.findCandidates(anyString(), any())).thenReturn(List.of());
        when(scorer.score(anyString(), any())).thenReturn(List.of());

        RagService.AskResponse response = ragService.ask("unbekanntes Thema", null);

        assertThat(response.answer()).contains("Keine passenden Inhalte");
        assertThat(response.sources()).isEmpty();
        verifyNoInteractions(claudeClient);
    }

    @Test
    void nurTop5ChunksWerdenAnClaudeUebergeben() {
        List<ChunkScorer.ScoredChunk> eightChunks = java.util.stream.IntStream.range(0, 8)
                .mapToObj(i -> new ChunkScorer.ScoredChunk(chunk((long) i, i, "text " + i), 1.0 - i * 0.1))
                .toList();

        when(repository.findCandidates(anyString(), any())).thenReturn(List.of());
        when(scorer.score(anyString(), any())).thenReturn(eightChunks);
        when(claudeClient.askWithHistory(anyString(), any(), anyString())).thenReturn("Antwort");

        RagService.AskResponse response = ragService.ask("frage", null);

        assertThat(response.sources()).hasSize(5);
    }

    @Test
    void quellenEnthaltenDokumentIdUndSeite() {
        Chunk c = chunk(42L, 7, "relevanter Text");
        ChunkScorer.ScoredChunk scored = new ChunkScorer.ScoredChunk(c, 0.9);

        when(repository.findCandidates(anyString(), any())).thenReturn(List.of(c));
        when(scorer.score(anyString(), any())).thenReturn(List.of(scored));
        when(claudeClient.askWithHistory(anyString(), any(), anyString())).thenReturn("Antwort");

        RagService.AskResponse response = ragService.ask("frage", null);

        RagService.Source source = response.sources().get(0);
        assertThat(source.documentId()).isEqualTo(42L);
        assertThat(source.page()).isEqualTo(7);
    }

    private Chunk chunk(Long docId, int page, String text) {
        Chunk c = new Chunk();
        c.setDocumentId(docId);
        c.setPageNumber(page);
        c.setChunkIndex(0);
        c.setText(text);
        return c;
    }
}
