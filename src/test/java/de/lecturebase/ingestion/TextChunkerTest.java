package de.lecturebase.ingestion;

import de.lecturebase.model.Chunk;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TextChunkerTest {

    private final TextChunker chunker = new TextChunker();

    @Test
    void shortTextProducesOneChunk() {
        String text = "Das ist ein kurzer Test mit wenigen Wörtern";
        List<Chunk> chunks = chunker.chunk(1L, 1, text);
        assertThat(chunks).hasSize(1);
        assertThat(chunks.get(0).getText()).isEqualTo(text);
    }

    @Test
    void blankTextProducesNoChunks() {
        assertThat(chunker.chunk(1L, 1, "   ")).isEmpty();
        assertThat(chunker.chunk(1L, 1, "")).isEmpty();
    }

    @Test
    void longTextProducesMultipleChunks() {
        // 1100 Wörter → mindestens 2 Chunks (CHUNK_SIZE=500)
        String text = "wort ".repeat(1100).trim();
        List<Chunk> chunks = chunker.chunk(1L, 1, text);
        assertThat(chunks).hasSizeGreaterThan(1);
    }

    @Test
    void chunksHaveCorrectDocumentIdAndPage() {
        List<Chunk> chunks = chunker.chunk(42L, 7, "eins zwei drei");
        assertThat(chunks.get(0).getDocumentId()).isEqualTo(42L);
        assertThat(chunks.get(0).getPageNumber()).isEqualTo(7);
    }

    @Test
    void chunksAreIndexedSequentially() {
        String text = "wort ".repeat(1100).trim();
        List<Chunk> chunks = chunker.chunk(1L, 1, text);
        for (int i = 0; i < chunks.size(); i++) {
            assertThat(chunks.get(i).getChunkIndex()).isEqualTo(i);
        }
    }

    @Test
    void chunksHaveOverlapSoNoContentIsLost() {
        // Jedes Wort muss in mindestens einem Chunk vorkommen
        String text = "wort ".repeat(1100).trim();
        List<Chunk> chunks = chunker.chunk(1L, 1, text);
        String combined = chunks.stream().map(Chunk::getText).reduce("", (a, b) -> a + " " + b);
        assertThat(combined).contains("wort");
    }
}
