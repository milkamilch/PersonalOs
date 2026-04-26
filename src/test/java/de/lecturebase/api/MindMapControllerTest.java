package de.lecturebase.api;

import de.lecturebase.ai.MindMapService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MindMapController.class)
class MindMapControllerTest {

    @Autowired MockMvc mvc;
    @MockBean MindMapService mindMapService;

    @Test
    void buildGibtVerarbeitungsstatistikZurueck() throws Exception {
        when(mindMapService.build(any()))
                .thenReturn(new MindMapService.BuildResult(12, 48));

        mvc.perform(post("/api/mindmap/build"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processedChunks").value(12))
                .andExpect(jsonPath("$.extractedConcepts").value(48));
    }

    @Test
    void buildMitDokumentIdWirdWeitergegeben() throws Exception {
        when(mindMapService.build(5L))
                .thenReturn(new MindMapService.BuildResult(3, 10));

        mvc.perform(post("/api/mindmap/build").param("documentId", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processedChunks").value(3));
    }

    @Test
    void getGraphGibtKnotenUndKantenZurueck() throws Exception {
        MindMapService.NodeDto node = new MindMapService.NodeDto(1L, "Quicksort", 3);
        MindMapService.LinkDto link = new MindMapService.LinkDto(1L, 2L, 2.0);
        when(mindMapService.getGraphData())
                .thenReturn(new MindMapService.GraphData(List.of(node), List.of(link)));

        mvc.perform(get("/api/mindmap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes[0].name").value("Quicksort"))
                .andExpect(jsonPath("$.nodes[0].degree").value(3))
                .andExpect(jsonPath("$.links[0].source").value(1))
                .andExpect(jsonPath("$.links[0].weight").value(2.0));
    }

    @Test
    void getGraphBeiLeeremGraphLiefertLeereArrays() throws Exception {
        when(mindMapService.getGraphData())
                .thenReturn(new MindMapService.GraphData(List.of(), List.of()));

        mvc.perform(get("/api/mindmap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes").isEmpty())
                .andExpect(jsonPath("$.links").isEmpty());
    }
}
