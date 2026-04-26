package de.lecturebase.api;

import de.lecturebase.ai.ChatSession;
import de.lecturebase.ai.ChatSessionStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExportController.class)
class ExportControllerTest {

    @Autowired MockMvc mvc;
    @MockBean ChatSessionStore sessionStore;

    @Test
    void exportMarkdownEnthältFrageUndAntwort() throws Exception {
        ChatSession session = new ChatSession("test-session");
        session.add("user",      "Kontext:\n[1] Seite 1:\nText\n\nFrage: Was ist Quicksort?");
        session.add("assistant", "Quicksort ist ein effizienter Sortieralgorithmus.");
        when(sessionStore.getOrCreate("test-session")).thenReturn(session);

        mvc.perform(get("/api/export/test-session?format=markdown"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString(".md")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Was ist Quicksort?")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Quicksort ist ein effizienter")));
    }

    @Test
    void exportPlaintextFunktioniert() throws Exception {
        ChatSession session = new ChatSession("s2");
        session.add("user",      "Frage: Erkläre Mergesort");
        session.add("assistant", "Mergesort teilt das Array rekursiv auf.");
        when(sessionStore.getOrCreate("s2")).thenReturn(session);

        mvc.perform(get("/api/export/s2?format=txt"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString(".txt")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("FRAGE:")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("ANTWORT:")));
    }

    @Test
    void markdownIstStandardformat() throws Exception {
        ChatSession session = new ChatSession("s3");
        when(sessionStore.getOrCreate("s3")).thenReturn(session);

        mvc.perform(get("/api/export/s3"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString(".md")));
    }

    @Test
    void leereSessionExportiertOhneAbsturz() throws Exception {
        ChatSession session = new ChatSession("leer");
        when(sessionStore.getOrCreate("leer")).thenReturn(session);

        mvc.perform(get("/api/export/leer"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("UniMind")));
    }
}
