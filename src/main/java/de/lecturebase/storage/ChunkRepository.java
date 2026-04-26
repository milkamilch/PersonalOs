package de.lecturebase.storage;

import de.lecturebase.model.Chunk;
import de.lecturebase.model.Document;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class ChunkRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Chunk> chunkMapper = (rs, row) -> {
        Chunk c = new Chunk();
        c.setId(rs.getLong("id"));
        c.setDocumentId(rs.getLong("document_id"));
        c.setPageNumber(rs.getInt("page_number"));
        c.setChunkIndex(rs.getInt("chunk_index"));
        c.setText(rs.getString("text"));
        return c;
    };

    public ChunkRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long saveDocument(String name, String filePath) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO documents (name, file_path) VALUES (?, ?)",
                Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, name);
            ps.setString(2, filePath);
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void saveChunks(List<Chunk> chunks) {
        for (Chunk chunk : chunks) {
            jdbc.update(
                "INSERT INTO chunks (document_id, page_number, chunk_index, text) VALUES (?, ?, ?, ?)",
                chunk.getDocumentId(), chunk.getPageNumber(), chunk.getChunkIndex(), chunk.getText()
            );
        }
    }

    public List<Chunk> findChunksByDocument(Long documentId) {
        return jdbc.query(
            "SELECT * FROM chunks WHERE document_id = ? ORDER BY page_number, chunk_index",
            chunkMapper,
            documentId
        );
    }

    public List<Chunk> findAllChunks() {
        return jdbc.query(
            "SELECT * FROM chunks ORDER BY document_id, page_number, chunk_index",
            chunkMapper
        );
    }

    /**
     * Liefert bis zu 100 Chunks, die mindestens einen Suchbegriff enthalten.
     * Dient als Vorfilter für den ChunkScorer, damit nicht alle Chunks geladen werden müssen.
     */
    public List<Chunk> findCandidates(String query) {
        List<String> terms = Arrays.stream(query.toLowerCase().split("\\s+"))
                .filter(w -> w.length() >= 3)
                .distinct()
                .limit(10)
                .toList();

        if (terms.isEmpty()) return findAllChunks();

        String conditions = terms.stream()
                .map(t -> "lower(text) LIKE ?")
                .collect(Collectors.joining(" OR "));

        Object[] params = terms.stream().map(t -> "%" + t + "%").toArray();

        return jdbc.query(
            "SELECT * FROM chunks WHERE " + conditions + " LIMIT 100",
            chunkMapper,
            params
        );
    }

    public List<Document> findAllDocuments() {
        return jdbc.query(
            "SELECT * FROM documents ORDER BY uploaded_at DESC",
            (rs, row) -> {
                Document d = new Document();
                d.setId(rs.getLong("id"));
                d.setName(rs.getString("name"));
                d.setFilePath(rs.getString("file_path"));
                return d;
            }
        );
    }
}
