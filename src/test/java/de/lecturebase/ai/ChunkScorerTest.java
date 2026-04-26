package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ChunkScorerTest {

    private final ChunkScorer scorer = new ChunkScorer();

    @Test
    void chunkMitAllenQueryTermsHatScore1() {
        Chunk c = chunk("quicksort mergesort algorithmus");
        List<ChunkScorer.ScoredChunk> result = scorer.score("quicksort mergesort algorithmus", List.of(c));
        assertThat(result).hasSize(1);
        assertThat(result.get(0).score()).isEqualTo(1.0);
    }

    @Test
    void chunkOhneUebereinstimmungWirdGefiltert() {
        Chunk c = chunk("Datenbanken SQL Tabellen");
        List<ChunkScorer.ScoredChunk> result = scorer.score("quicksort algorithmus", List.of(c));
        assertThat(result).isEmpty();
    }

    @Test
    void partielleUebereinstimmungLiefertScoreZwischen0Und1() {
        Chunk c = chunk("quicksort ist ein sortieralgorithmus");
        List<ChunkScorer.ScoredChunk> result = scorer.score("quicksort mergesort", List.of(c));
        assertThat(result).hasSize(1);
        assertThat(result.get(0).score()).isEqualTo(0.5);
    }

    @Test
    void ergebnisteIstNachScoreAbsteigendSortiert() {
        Chunk c1 = chunk("quicksort ist schnell");
        Chunk c2 = chunk("quicksort mergesort beide sortieralgorithmen");
        List<ChunkScorer.ScoredChunk> result = scorer.score("quicksort mergesort", List.of(c1, c2));
        assertThat(result.get(0).score()).isGreaterThanOrEqualTo(result.get(1).score());
    }

    @Test
    void kurzeWörterWerdenAlsStopwordsIgnoriert() {
        // "in", "an", "zu" sind zu kurz (< 3 Zeichen) und werden ignoriert
        Set<String> terms = scorer.tokenize("in an zu der die das");
        assertThat(terms).doesNotContain("in", "an", "zu");
    }

    @Test
    void leerQueryLiefertAlleChunksOhneFiltern() {
        Chunk c = chunk("beliebiger Inhalt");
        List<ChunkScorer.ScoredChunk> result = scorer.score("", List.of(c));
        assertThat(result).hasSize(1);
        assertThat(result.get(0).score()).isEqualTo(0.0);
    }

    private Chunk chunk(String text) {
        Chunk c = new Chunk();
        c.setId(1L);
        c.setDocumentId(1L);
        c.setPageNumber(1);
        c.setChunkIndex(0);
        c.setText(text);
        return c;
    }
}
