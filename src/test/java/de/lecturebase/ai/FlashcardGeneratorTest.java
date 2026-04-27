package de.lecturebase.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.FlashcardRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FlashcardGeneratorTest {

    @Mock  GeminiClient        claudeClient;
    @Mock  ChunkRepository     chunkRepository;
    @Mock  FlashcardRepository flashcardRepository;
    @Spy   ObjectMapper        objectMapper = new ObjectMapper();

    @InjectMocks FlashcardGenerator generator;

    @Test
    void parseJsonExtrahiertKartenAusArray() {
        List<FlashcardGenerator.RawCard> cards = generator.parseJson("""
                [
                  {"question": "Was ist Quicksort?", "answer": "Ein Sortieralgorithmus."},
                  {"question": "Was ist Mergesort?", "answer": "Teile und herrsche."}
                ]
                """);
        assertThat(cards).hasSize(2);
        assertThat(cards.get(0).question()).isEqualTo("Was ist Quicksort?");
        assertThat(cards.get(1).answer()).isEqualTo("Teile und herrsche.");
    }

    @Test
    void parseJsonTolerriertBegleittext() {
        List<FlashcardGenerator.RawCard> cards = generator.parseJson(
                "Hier sind die Lernkarten: [{\"question\":\"Q\",\"answer\":\"A\"}] Ende."
        );
        assertThat(cards).hasSize(1);
    }

    @Test
    void parseJsonBeiUngueltigemFormatLeereListe() {
        assertThat(generator.parseJson("Keine Karten vorhanden.")).isEmpty();
    }

    @Test
    void generateForDocumentSpeichertAlleKarten() {
        Chunk chunk = new Chunk();
        chunk.setId(1L);
        chunk.setDocumentId(10L);
        chunk.setText("Algorithmen Text");
        when(chunkRepository.findChunksByDocument(10L)).thenReturn(List.of(chunk));
        when(claudeClient.ask(anyString(), anyString()))
                .thenReturn("[{\"question\":\"Q1\",\"answer\":\"A1\"},{\"question\":\"Q2\",\"answer\":\"A2\"}]");

        FlashcardGenerator.GenerateResult result = generator.generateForDocument(10L);

        assertThat(result.processedChunks()).isEqualTo(1);
        assertThat(result.createdCards()).isEqualTo(2);
        verify(flashcardRepository, times(2)).save(any());
    }

    @Test
    void generateForDocumentUeberspringtChunksOhneKarten() {
        Chunk chunk = new Chunk();
        chunk.setId(1L);
        chunk.setDocumentId(10L);
        chunk.setText("Text ohne nutzbare Karten");
        when(chunkRepository.findChunksByDocument(10L)).thenReturn(List.of(chunk));
        when(claudeClient.ask(anyString(), anyString())).thenReturn("kein JSON");

        FlashcardGenerator.GenerateResult result = generator.generateForDocument(10L);

        assertThat(result.createdCards()).isEqualTo(0);
        verify(flashcardRepository, never()).save(any());
    }
}
