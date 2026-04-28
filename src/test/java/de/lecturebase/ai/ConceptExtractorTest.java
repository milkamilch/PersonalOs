package de.lecturebase.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConceptExtractorTest {

    @Mock  AiClient     claudeClient;
    @Spy   ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks ConceptExtractor extractor;

    @Test
    void extrahiertKonzepteAusBatch() {
        when(claudeClient.ask(anyString(), anyString(), anyInt()))
                .thenReturn("""
                        [["Quicksort", "Rekursion"], ["Stack", "Heap"]]
                        """);

        List<List<String>> result = extractor.extractBatch(List.of("Sortierung", "Speicher"));

        assertThat(result).hasSize(2);
        assertThat(result.get(0)).containsExactly("Quicksort", "Rekursion");
        assertThat(result.get(1)).containsExactly("Stack", "Heap");
    }

    @Test
    void tolerriertBegleittext() {
        when(claudeClient.ask(anyString(), anyString(), anyInt()))
                .thenReturn("Hier: [[\"Stack\", \"Heap\"]] – Ende.");

        List<List<String>> result = extractor.extractBatch(List.of("Speicher"));

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).containsExactly("Stack", "Heap");
    }

    @Test
    void liefertLeereListeBeiUngueltigemJSON() {
        when(claudeClient.ask(anyString(), anyString(), anyInt()))
                .thenReturn("Ich konnte keine Konzepte extrahieren.");

        List<List<String>> result = extractor.extractBatch(List.of("Text"));

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isEmpty();
    }

    @Test
    void parseNestedJsonArrayMitLeeremArray() {
        assertThat(extractor.parseNestedJsonArray("[]")).isEmpty();
    }

    @Test
    void parseNestedJsonArrayOhneKlammernGibtLeereListeZurueck() {
        assertThat(extractor.parseNestedJsonArray("kein array hier")).isEmpty();
    }

    @Test
    void parseNestedJsonArrayExtrahiertKorrekt() {
        List<List<String>> result = extractor.parseNestedJsonArray("[[\"A\", \"B\"],[\"C\"]]");
        assertThat(result).hasSize(2);
        assertThat(result.get(0)).containsExactly("A", "B");
        assertThat(result.get(1)).containsExactly("C");
    }
}
