package de.lecturebase.api;

import de.lecturebase.ai.AiClient;
import de.lecturebase.ai.ChatSession;
import de.lecturebase.ai.ChatSessionStore;
import de.lecturebase.model.Document;
import de.lecturebase.model.Flashcard;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.ConceptRepository;
import de.lecturebase.storage.FlashcardRepository;
import de.lecturebase.storage.SummaryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExportController.class)
class ExportControllerTest {

    @Autowired MockMvc mvc;
    @MockBean ChatSessionStore    sessionStore;
    @MockBean FlashcardRepository flashcardRepository;
    @MockBean SummaryRepository   summaryRepository;
    @MockBean ChunkRepository     chunkRepository;
    @MockBean ConceptRepository   conceptRepository;
    @MockBean AiClient            aiClient;

    // ── Chat export ──────────────────────────────────────────────────

    @Test
    void exportMarkdownEnthältFrageUndAntwort() throws Exception {
        ChatSession session = new ChatSession("test-session");
        session.add("user",      "Kontext:\n[1] Seite 1:\nText\n\nFrage: Was ist Quicksort?");
        session.add("assistant", "Quicksort ist ein effizienter Sortieralgorithmus.");
        when(sessionStore.getOrCreate("test-session")).thenReturn(session);

        mvc.perform(get("/api/export/test-session?format=markdown"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString(".md")))
                .andExpect(content().string(containsString("Was ist Quicksort?")))
                .andExpect(content().string(containsString("Quicksort ist ein effizienter")));
    }

    @Test
    void exportPlaintextFunktioniert() throws Exception {
        ChatSession session = new ChatSession("s2");
        session.add("user",      "Frage: Erkläre Mergesort");
        session.add("assistant", "Mergesort teilt das Array rekursiv auf.");
        when(sessionStore.getOrCreate("s2")).thenReturn(session);

        mvc.perform(get("/api/export/s2?format=txt"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString(".txt")))
                .andExpect(content().string(containsString("FRAGE:")))
                .andExpect(content().string(containsString("ANTWORT:")));
    }

    @Test
    void markdownIstStandardformat() throws Exception {
        ChatSession session = new ChatSession("s3");
        when(sessionStore.getOrCreate("s3")).thenReturn(session);

        mvc.perform(get("/api/export/s3"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString(".md")));
    }

    @Test
    void leereSessionExportiertOhneAbsturz() throws Exception {
        ChatSession session = new ChatSession("leer");
        when(sessionStore.getOrCreate("leer")).thenReturn(session);

        mvc.perform(get("/api/export/leer"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("UniMind")));
    }

    // ── Flashcard export ─────────────────────────────────────────────

    @Test
    void flashcardExportEnthältFrageUndAntwort() throws Exception {
        Document doc = new Document();
        doc.setId(1L);
        doc.setName("Algorithmen");
        when(chunkRepository.findAllDocuments()).thenReturn(List.of(doc));

        Flashcard fc = new Flashcard();
        fc.setId(1L);
        fc.setQuestion("Was ist Quicksort?");
        fc.setAnswer("Ein Divide-and-Conquer-Sortieralgorithmus.");
        fc.setKnown(true);
        when(flashcardRepository.findByDocument(1L)).thenReturn(List.of(fc));

        mvc.perform(get("/api/export/flashcards/1"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("lernkarten")))
                .andExpect(content().string(containsString("Was ist Quicksort?")))
                .andExpect(content().string(containsString("Ein Divide-and-Conquer")))
                .andExpect(content().string(containsString("Algorithmen")));
    }

    @Test
    void flashcardExportMitLeeremDokumentFunktioniert() throws Exception {
        when(chunkRepository.findAllDocuments()).thenReturn(List.of());
        when(flashcardRepository.findByDocument(99L)).thenReturn(List.of());

        mvc.perform(get("/api/export/flashcards/99"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Dokument 99")));
    }

    // ── Summary export ───────────────────────────────────────────────

    @Test
    void summaryExportEnthältZusammenfassung() throws Exception {
        Document doc = new Document();
        doc.setId(2L);
        doc.setName("Datenstrukturen");
        when(chunkRepository.findAllDocuments()).thenReturn(List.of(doc));
        when(summaryRepository.findByDocument(2L))
                .thenReturn(Optional.of("Eine Zusammenfassung über Bäume und Graphen."));

        mvc.perform(get("/api/export/summary/2"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("zusammenfassung")))
                .andExpect(content().string(containsString("Datenstrukturen")))
                .andExpect(content().string(containsString("Bäume und Graphen")));
    }

    @Test
    void summaryExportOhneZusammenfassungGibtPlatzhalterZurueck() throws Exception {
        when(chunkRepository.findAllDocuments()).thenReturn(List.of());
        when(summaryRepository.findByDocument(5L)).thenReturn(Optional.empty());

        mvc.perform(get("/api/export/summary/5"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Keine Zusammenfassung vorhanden")));
    }
}
