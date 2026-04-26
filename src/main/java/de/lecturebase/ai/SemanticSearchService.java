package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.EmbeddingRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class SemanticSearchService {

    private final EmbeddingClient      embeddingClient;
    private final EmbeddingRepository  embeddingRepository;
    private final ChunkRepository      chunkRepository;

    public SemanticSearchService(EmbeddingClient embeddingClient,
                                 EmbeddingRepository embeddingRepository,
                                 ChunkRepository chunkRepository) {
        this.embeddingClient     = embeddingClient;
        this.embeddingRepository = embeddingRepository;
        this.chunkRepository     = chunkRepository;
    }

    public boolean isAvailable() { return embeddingClient.isEnabled(); }

    /**
     * Sucht die top-k ähnlichsten Chunks anhand Cosinus-Ähnlichkeit.
     * Filtert optional nach Tag (tag = null → alle Dokumente).
     */
    public List<Chunk> findSimilar(String query, int topK, String tag) {
        double[] queryVec = embeddingClient.embed(query);

        List<EmbeddingRepository.ChunkEmbedding> candidates = tag != null
                ? embeddingRepository.findByTag(tag)
                : embeddingRepository.findAll();

        return candidates.stream()
                .map(ce -> Map.entry(ce.chunkId(), cosineSimilarity(queryVec, ce.embedding())))
                .sorted(Map.Entry.<Long, Double>comparingByValue(Comparator.reverseOrder()))
                .limit(topK)
                .map(e -> chunkRepository.findById(e.getKey()))
                .flatMap(java.util.Optional::stream)
                .toList();
    }

    double cosineSimilarity(double[] a, double[] b) {
        double dot = 0, normA = 0, normB = 0;
        int len = Math.min(a.length, b.length);
        for (int i = 0; i < len; i++) {
            dot   += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
