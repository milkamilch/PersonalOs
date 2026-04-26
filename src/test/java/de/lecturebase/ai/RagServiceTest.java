package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RagServiceTest {

    @Mock ChunkRepository repository;
    @Mock ChunkScorer     scorer;
    @Mock ClaudeClient    claudeClient;

    @InjectMocks RagService ragService;

    @Test
    void frageWirdAnClaudeWeitergegebenMitKontext() {
        Chunk c = chunk(1L, 2, "Quicksort teilt die Liste rekursiv auf");
        ChunkScorer.ScoredChunk scored = new ChunkScorer.ScoredChunk(c, 0.8);

        when(repository.findCandidates("quicksort")).thenReturn(List.of(c));
        when(scorer.score(anyString(), any())).thenReturn(List.of(scored));
        when(claudeClient.ask(anyString(), anyString())).thenReturn("Quicksort ist ein Divide-and-Conquer-Algorithmus.");

        RagService.AskResponse response = ragService.ask("quicksort");

        assertThat(response.answer()).contains("Quicksort");
        assertThat(response.sources()).hasSize(1);
        assertThat(response.sources().get(0).page()).isEqualTo(2);
        verify(claudeClient).ask(anyString(), anyString());
    }

    @Test
    void keineKandidatenLiefertFallbackAntwort() {
        when(repository.findCandidates(anyString())).thenReturn(List.of());
        when(scorer.score(anyString(), any())).thenReturn(List.of());

        RagService.AskResponse response = ragService.ask("unbekanntes Thema");

        assertThat(response.answer()).contains("nicht in deinen Skripten");
        assertThat(response.sources()).isEmpty();
        verifyNoInteractions(claudeClient);
    }

    @Test
    void nurTop5ChunksWerdenAnClaudeUebergeben() {
        // 8 Chunks erstellen
        List<ChunkScorer.ScoredChunk> eightChunks = java.util.stream.IntStream.range(0, 8)
                .mapToObj(i -> new ChunkScorer.ScoredChunk(chunk((long) i, i, "text " + i), 1.0 - i * 0.1))
                .toList();

        when(repository.findCandidates(anyString())).thenReturn(List.of());
        when(scorer.score(anyString(), any())).thenReturn(eightChunks);
        when(claudeClient.ask(anyString(), anyString())).thenReturn("Antwort");

        RagService.AskResponse response = ragService.ask("frage");

        // Nur Top 5 als Quellen zurückgegeben
        assertThat(response.sources()).hasSize(5);
    }

    @Test
    void quellenenthalteDokumentIdUndSeite() {
        Chunk c = chunk(42L, 7, "relevanter Text");
        ChunkScorer.ScoredChunk scored = new ChunkScorer.ScoredChunk(c, 0.9);

        when(repository.findCandidates(anyString())).thenReturn(List.of(c));
        when(scorer.score(anyString(), any())).thenReturn(List.of(scored));
        when(claudeClient.ask(anyString(), anyString())).thenReturn("Antwort");

        RagService.AskResponse response = ragService.ask("frage");

        RagService.Source source = response.sources().get(0);
        assertThat(source.documentId()).isEqualTo(42L);
        assertThat(source.page()).isEqualTo(7);
        assertThat(source.relevance()).isEqualTo(0.9);
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
