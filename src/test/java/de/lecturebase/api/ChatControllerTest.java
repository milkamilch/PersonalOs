package de.lecturebase.api;

import de.lecturebase.ai.ChatSession;
import de.lecturebase.ai.ChatSessionStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired MockMvc mvc;
    @MockBean ChatSessionStore sessionStore;

    @Test
    void listSessionsGibtAlleIdsZurueck() throws Exception {
        when(sessionStore.listSessionIds()).thenReturn(List.of("abc", "def"));

        mvc.perform(get("/api/chat/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("abc"))
                .andExpect(jsonPath("$[1]").value("def"));
    }

    @Test
    void listSessionsLeerListeWennKeineSessionsExistieren() throws Exception {
        when(sessionStore.listSessionIds()).thenReturn(List.of());

        mvc.perform(get("/api/chat/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void messagesGibtNachrichtenHistorieZurueck() throws Exception {
        ChatSession session = new ChatSession("s1");
        session.add("user",      "Was ist Quicksort?");
        session.add("assistant", "Ein Sortieralgorithmus.");
        when(sessionStore.getOrCreate("s1")).thenReturn(session);

        mvc.perform(get("/api/chat/sessions/s1/messages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("user"))
                .andExpect(jsonPath("$[0].content").value("Was ist Quicksort?"))
                .andExpect(jsonPath("$[1].role").value("assistant"));
    }

    @Test
    void deleteSessionGibtOkZurueck() throws Exception {
        doNothing().when(sessionStore).remove("s1");

        mvc.perform(delete("/api/chat/sessions/s1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"));

        verify(sessionStore).remove("s1");
    }
}
