package de.lecturebase.search;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SearchService {

    private final JdbcTemplate jdbc;

    public SearchService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<SearchResult> search(String query, String tag) {
        String pattern = "%" + query.toLowerCase() + "%";

        if (tag != null && !tag.isBlank()) {
            return jdbc.query("""
                    SELECT c.id, c.document_id, c.page_number, c.text, d.name AS document_name
                    FROM chunks c
                    JOIN documents d ON c.document_id = d.id
                    JOIN document_tags dt ON d.id = dt.document_id
                    JOIN tags t ON dt.tag_id = t.id
                    WHERE lower(c.text) LIKE ? AND t.name = ?
                    ORDER BY d.name, c.page_number, c.chunk_index
                    LIMIT 20
                    """, resultMapper(), pattern, tag);
        }

        return jdbc.query("""
                SELECT c.id, c.document_id, c.page_number, c.text, d.name AS document_name
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE lower(c.text) LIKE ?
                ORDER BY d.name, c.page_number, c.chunk_index
                LIMIT 20
                """, resultMapper(), pattern);
    }

    private org.springframework.jdbc.core.RowMapper<SearchResult> resultMapper() {
        return (rs, row) -> new SearchResult(
                rs.getLong("id"),
                rs.getLong("document_id"),
                rs.getString("document_name"),
                rs.getInt("page_number"),
                rs.getString("text")
        );
    }

    public record SearchResult(long chunkId, long documentId, String documentName, int page, String text) {}
}
