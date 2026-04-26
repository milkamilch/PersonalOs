package de.lecturebase.api;

import de.lecturebase.ingestion.IngestionService;
import de.lecturebase.model.Document;
import de.lecturebase.storage.ChunkRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(IngestionController.class)
class IngestionControllerTest {

    @Autowired MockMvc mvc;
    @MockBean IngestionService ingestionService;
    @MockBean ChunkRepository chunkRepository;

    @Test
    void uploadGibtIngestionResultZurueck() throws Exception {
        when(ingestionService.ingest(any()))
                .thenReturn(new IngestionService.IngestionResult(1L, "skript.pdf", 10, 25));

        MockMultipartFile file = new MockMultipartFile(
                "file", "skript.pdf", "application/pdf", "PDF content".getBytes()
        );

        mvc.perform(multipart("/api/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value(1))
                .andExpect(jsonPath("$.name").value("skript.pdf"))
                .andExpect(jsonPath("$.pages").value(10))
                .andExpect(jsonPath("$.chunks").value(25));
    }

    @Test
    void documentsGibtListeZurueck() throws Exception {
        Document doc = new Document();
        doc.setId(1L);
        doc.setName("algo.pdf");
        doc.setFilePath("/tmp/algo.pdf");
        when(chunkRepository.findAllDocuments()).thenReturn(List.of(doc));

        mvc.perform(get("/api/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("algo.pdf"));
    }

    @Test
    void documentsLeerListeWennKeineVorhanden() throws Exception {
        when(chunkRepository.findAllDocuments()).thenReturn(List.of());

        mvc.perform(get("/api/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }
}
