package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.SummaryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SummaryServiceTest {

    @Mock GeminiClient      claudeClient;
    @Mock ChunkRepository   chunkRepository;
    @Mock SummaryRepository summaryRepository;

    @InjectMocks SummaryService summaryService;

    @Test
    void generateSpeichertZusammenfassung() {
        Chunk chunk = chunk(1L, 10L, "Quicksort ist ein Sortieralgorithmus.");
        when(chunkRepository.findChunksByDocument(10L)).thenReturn(List.of(chunk));
        when(claudeClient.ask(anyString(), anyString())).thenReturn("Zusammenfassung des Texts.");

        SummaryService.SummaryResult result = summaryService.generateForDocument(10L, false);

        assertThat(result.generated()).isTrue();
        assertThat(result.summary()).isEqualTo("Zusammenfassung des Texts.");
        assertThat(result.documentId()).isEqualTo(10L);
        verify(summaryRepository).save(eq(10L), eq("Zusammenfassung des Texts."));
    }

    @Test
    void generateOhneChunksGibtLeeresResultZurueck() {
        when(chunkRepository.findChunksByDocument(99L)).thenReturn(Collections.emptyList());

        SummaryService.SummaryResult result = summaryService.generateForDocument(99L, false);

        assertThat(result.generated()).isFalse();
        assertThat(result.summary()).isEmpty();
        verifyNoInteractions(claudeClient, summaryRepository);
    }

    @Test
    void generateBegrenztAuf15Chunks() {
        List<Chunk> chunks = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            chunks.add(chunk((long) i, 5L, "Text " + i));
        }
        when(chunkRepository.findChunksByDocument(5L)).thenReturn(chunks);
        when(claudeClient.ask(anyString(), anyString())).thenReturn("Summary");

        summaryService.generateForDocument(5L, false);

        verify(claudeClient).ask(anyString(), argThat(ctx ->
                ctx.contains("Text 15") && !ctx.contains("Text 16")));
    }

    @Test
    void generateVerbindetChunksMitTrenner() {
        Chunk c1 = chunk(1L, 7L, "Erster Abschnitt.");
        Chunk c2 = chunk(2L, 7L, "Zweiter Abschnitt.");
        when(chunkRepository.findChunksByDocument(7L)).thenReturn(List.of(c1, c2));
        when(claudeClient.ask(anyString(), anyString())).thenReturn("OK");

        summaryService.generateForDocument(7L, false);

        verify(claudeClient).ask(anyString(), argThat(ctx ->
                ctx.contains("Erster Abschnitt.") &&
                ctx.contains("---") &&
                ctx.contains("Zweiter Abschnitt.")));
    }

    private Chunk chunk(long id, long documentId, String text) {
        Chunk c = new Chunk();
        c.setId(id);
        c.setDocumentId(documentId);
        c.setText(text);
        return c;
    }
}
