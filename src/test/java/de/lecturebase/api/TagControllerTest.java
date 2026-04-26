package de.lecturebase.api;

import de.lecturebase.storage.TagRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TagController.class)
class TagControllerTest {

    @Autowired MockMvc mvc;
    @MockBean TagRepository tagRepository;

    @Test
    void listTagsGibtAlleTagsZurueck() throws Exception {
        when(tagRepository.findAll()).thenReturn(List.of("Algorithmen", "Mathe", "Physik"));

        mvc.perform(get("/api/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").value("Algorithmen"))
                .andExpect(jsonPath("$[1]").value("Mathe"))
                .andExpect(jsonPath("$[2]").value("Physik"));
    }

    @Test
    void addTagsVerknuepftTagsMitDokument() throws Exception {
        when(tagRepository.getOrCreate("Informatik")).thenReturn(1L);

        mvc.perform(post("/api/documents/42/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                ["Informatik"]
                                """))
                .andExpect(status().isOk());

        verify(tagRepository).getOrCreate("Informatik");
        verify(tagRepository).assignToDocument(42L, 1L);
    }

    @Test
    void removeTagLoeschtZuordnung() throws Exception {
        mvc.perform(delete("/api/documents/5/tags/Mathe"))
                .andExpect(status().isOk());

        verify(tagRepository).removeFromDocument(5L, "Mathe");
    }
}
