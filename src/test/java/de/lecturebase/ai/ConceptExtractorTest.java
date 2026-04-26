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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConceptExtractorTest {

    @Mock  ClaudeClient  claudeClient;
    @Spy   ObjectMapper  objectMapper = new ObjectMapper();

    @InjectMocks ConceptExtractor extractor;

    @Test
    void extrahiertKonzepteAusClaudeAntwort() {
        when(claudeClient.ask(anyString(), anyString()))
                .thenReturn("""
                        ["Quicksort", "Rekursion", "Divide-and-Conquer"]
                        """);

        List<String> result = extractor.extract("Ein Text über Sortieralgorithmen");

        assertThat(result).containsExactly("Quicksort", "Rekursion", "Divide-and-Conquer");
    }

    @Test
    void tolerriertBegleittext() {
        when(claudeClient.ask(anyString(), anyString()))
                .thenReturn("Hier sind die Konzepte: [\"Stack\", \"Heap\"] – Ende.");

        List<String> result = extractor.extract("Speicherverwaltung");

        assertThat(result).containsExactly("Stack", "Heap");
    }

    @Test
    void liefertLeereListeBeiUngueltigemJSON() {
        when(claudeClient.ask(anyString(), anyString()))
                .thenReturn("Ich konnte keine Konzepte extrahieren.");

        List<String> result = extractor.extract("Leerer Text");

        assertThat(result).isEmpty();
    }

    @Test
    void parseJsonArrayMitLeeremArray() {
        assertThat(extractor.parseJsonArray("[]")).isEmpty();
    }

    @Test
    void parseJsonArrayOhneKlammernGibtLeereListeZurueck() {
        assertThat(extractor.parseJsonArray("kein array hier")).isEmpty();
    }

    @Test
    void parseJsonArrayExtrahiertAusTextMitPrefix() {
        List<String> result = extractor.parseJsonArray("Ergebnis: [\"A\", \"B\", \"C\"]");
        assertThat(result).containsExactly("A", "B", "C");
    }
}
