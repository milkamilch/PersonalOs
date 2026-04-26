package de.lecturebase.api;

import de.lecturebase.ai.RagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AskController.class)
class AskControllerTest {

    @Autowired MockMvc mvc;
    @MockBean RagService ragService;

    @Test
    void askGibtAntwortUndQuellenZurueck() throws Exception {
        RagService.Source source = new RagService.Source(1L, 5, 0.9);
        when(ragService.ask(anyString()))
                .thenReturn(new RagService.AskResponse("Quicksort ist ein Algorithmus.", List.of(source)));

        mvc.perform(post("/api/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"question": "Was ist Quicksort?"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("Quicksort ist ein Algorithmus."))
                .andExpect(jsonPath("$.sources[0].page").value(5))
                .andExpect(jsonPath("$.sources[0].relevance").value(0.9));
    }

    @Test
    void askOhneErgebnisseLiefertLeereQuellen() throws Exception {
        when(ragService.ask(anyString()))
                .thenReturn(new RagService.AskResponse(
                        "Diese Information befindet sich nicht in deinen Vorlesungsskripten.",
                        List.of()
                ));

        mvc.perform(post("/api/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"question": "Quantenphysik?"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sources").isEmpty());
    }
}
