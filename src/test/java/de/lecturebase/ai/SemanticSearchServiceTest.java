package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.EmbeddingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SemanticSearchServiceTest {

    @Mock EmbeddingClient     embeddingClient;
    @Mock EmbeddingRepository embeddingRepository;
    @Mock ChunkRepository     chunkRepository;

    @InjectMocks SemanticSearchService service;

    @Test
    void isAvailableGibtClientStatusZurueck() {
        when(embeddingClient.isEnabled()).thenReturn(true);
        assertThat(service.isAvailable()).isTrue();

        when(embeddingClient.isEnabled()).thenReturn(false);
        assertThat(service.isAvailable()).isFalse();
    }

    @Test
    void findSimilarSortiertNachCosinusAehnlichkeit() {
        when(embeddingClient.isEnabled()).thenReturn(true);
        when(embeddingClient.embed(anyString())).thenReturn(new double[]{1.0, 0.0});

        var e1 = new EmbeddingRepository.ChunkEmbedding(1L, new double[]{0.9, 0.1}); // ähnlich
        var e2 = new EmbeddingRepository.ChunkEmbedding(2L, new double[]{0.0, 1.0}); // weniger ähnlich
        when(embeddingRepository.findAll()).thenReturn(List.of(e2, e1)); // absichtlich falsche Reihenfolge

        Chunk c1 = chunk(1L); Chunk c2 = chunk(2L);
        when(chunkRepository.findById(1L)).thenReturn(Optional.of(c1));
        when(chunkRepository.findById(2L)).thenReturn(Optional.of(c2));

        List<Chunk> result = service.findSimilar("frage", 2, null);

        assertThat(result.get(0).getId()).isEqualTo(1L); // c1 ist ähnlicher
    }

    @Test
    void cosinusAehnlichkeitGleicherVektor() {
        double sim = service.cosineSimilarity(new double[]{1, 0, 0}, new double[]{1, 0, 0});
        assertThat(sim).isEqualTo(1.0);
    }

    @Test
    void cosinusAehnlichkeitSenkrecht() {
        double sim = service.cosineSimilarity(new double[]{1, 0}, new double[]{0, 1});
        assertThat(sim).isEqualTo(0.0);
    }

    @Test
    void cosinusAehnlichkeitNullvektorGibt0Zurueck() {
        double sim = service.cosineSimilarity(new double[]{0, 0}, new double[]{1, 1});
        assertThat(sim).isEqualTo(0.0);
    }

    private Chunk chunk(long id) {
        Chunk c = new Chunk();
        c.setId(id);
        c.setDocumentId(1L);
        c.setPageNumber(1);
        c.setText("Text " + id);
        return c;
    }
}
