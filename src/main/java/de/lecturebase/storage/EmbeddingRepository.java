package de.lecturebase.storage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Repository;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

@Repository
public class EmbeddingRepository {

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public EmbeddingRepository(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc         = jdbc;
        this.objectMapper = objectMapper;
    }

    public void save(long chunkId, double[] embedding) {
        try {
            String json = objectMapper.writeValueAsString(embedding);
            jdbc.update(
                "INSERT OR REPLACE INTO chunk_embeddings (chunk_id, embedding) VALUES (?, ?)",
                chunkId, json
            );
        } catch (Exception e) {
            throw new RuntimeException("Embedding konnte nicht gespeichert werden", e);
        }
    }

    public List<ChunkEmbedding> findAll() {
        return jdbc.query("SELECT chunk_id, embedding FROM chunk_embeddings", (rs, row) -> {
            try {
                double[] vec = objectMapper.readValue(
                    rs.getString("embedding"),
                    new TypeReference<double[]>() {}
                );
                return new ChunkEmbedding(rs.getLong("chunk_id"), vec);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }

    public List<ChunkEmbedding> findByTag(String tag) {
        return jdbc.query("""
                SELECT ce.chunk_id, ce.embedding
                FROM chunk_embeddings ce
                JOIN chunks c ON ce.chunk_id = c.id
                JOIN documents d ON c.document_id = d.id
                JOIN document_tags dt ON d.id = dt.document_id
                JOIN tags t ON dt.tag_id = t.id
                WHERE t.name = ?
                """,
                (rs, row) -> {
                    try {
                        double[] vec = objectMapper.readValue(
                            rs.getString("embedding"),
                            new TypeReference<double[]>() {}
                        );
                        return new ChunkEmbedding(rs.getLong("chunk_id"), vec);
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                }, tag);
    }

    public record ChunkEmbedding(long chunkId, double[] embedding) {}
}
