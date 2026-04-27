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
import java.util.Optional;
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

    public Optional<Chunk> findById(long id) {
        List<Chunk> result = jdbc.query("SELECT * FROM chunks WHERE id = ?", chunkMapper, id);
        return result.isEmpty() ? Optional.empty() : Optional.of(result.get(0));
    }

    public List<Document> findAllDocuments() {
        return findDocuments(null);
    }

    public List<Document> findByTag(String tag) {
        return findDocuments(tag);
    }

    private List<Document> findDocuments(String tag) {
        String sql = """
            SELECT d.id, d.name, d.file_path, d.uploaded_at,
                   GROUP_CONCAT(t.name, ',') AS tags
            FROM documents d
            LEFT JOIN document_tags dt ON d.id = dt.document_id
            LEFT JOIN tags t ON t.id = dt.tag_id
            %s
            GROUP BY d.id
            ORDER BY d.uploaded_at DESC
            """.formatted(tag != null ? "WHERE d.id IN (SELECT dt2.document_id FROM document_tags dt2 JOIN tags t2 ON dt2.tag_id = t2.id WHERE t2.name = ?)" : "");

        Object[] params = tag != null ? new Object[]{tag} : new Object[0];

        return jdbc.query(sql, (rs, row) -> {
            Document d = new Document();
            d.setId(rs.getLong("id"));
            d.setName(rs.getString("name"));
            d.setFilePath(rs.getString("file_path"));
            String rawTags = rs.getString("tags");
            if (rawTags != null) d.setTags(List.of(rawTags.split(",")));
            return d;
        }, params);
    }

    public void deleteDocument(long documentId) {
        jdbc.update("DELETE FROM chunk_embeddings WHERE chunk_id IN (SELECT id FROM chunks WHERE document_id = ?)", documentId);
        jdbc.update("DELETE FROM chunks        WHERE document_id = ?", documentId);
        jdbc.update("DELETE FROM flashcards    WHERE document_id = ?", documentId);
        jdbc.update("DELETE FROM summaries     WHERE document_id = ?", documentId);
        jdbc.update("DELETE FROM mindmap_status WHERE document_id = ?", documentId);
        jdbc.update("DELETE FROM document_tags  WHERE document_id = ?", documentId);
        jdbc.update("DELETE FROM documents      WHERE id = ?", documentId);
    }

    public List<Chunk> findCandidates(String query) {
        return findCandidates(query, null);
    }

    public List<Chunk> findCandidates(String query, String tag) {
        List<String> terms = Arrays.stream(query.toLowerCase().split("\\s+"))
                .filter(w -> w.length() >= 3)
                .distinct()
                .limit(10)
                .toList();

        String tagJoin = tag != null
            ? "JOIN document_tags dt ON c.document_id = dt.document_id JOIN tags tg ON dt.tag_id = tg.id"
            : "";
        String tagWhere = tag != null ? "AND tg.name = ?" : "";

        if (terms.isEmpty()) {
            if (tag == null) return findAllChunks();
            return jdbc.query(
                "SELECT c.* FROM chunks c " + tagJoin + " WHERE 1=1 " + tagWhere + " LIMIT 100",
                chunkMapper, tag
            );
        }

        String conditions = terms.stream()
                .map(t -> "lower(c.text) LIKE ?")
                .collect(Collectors.joining(" OR "));

        List<Object> params = new java.util.ArrayList<>(
            terms.stream().map(t -> (Object) ("%" + t + "%")).toList()
        );
        if (tag != null) params.add(tag);

        return jdbc.query(
            "SELECT c.* FROM chunks c " + tagJoin + " WHERE (" + conditions + ") " + tagWhere + " LIMIT 100",
            chunkMapper,
            params.toArray()
        );
    }
}
