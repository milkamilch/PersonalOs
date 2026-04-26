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

    public List<SearchResult> search(String query) {
        String pattern = "%" + query.toLowerCase() + "%";
        return jdbc.query("""
                SELECT c.id, c.document_id, c.page_number, c.text, d.name AS document_name
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE lower(c.text) LIKE ?
                ORDER BY d.name, c.page_number, c.chunk_index
                LIMIT 20
                """,
                (rs, row) -> new SearchResult(
                        rs.getLong("id"),
                        rs.getLong("document_id"),
                        rs.getString("document_name"),
                        rs.getInt("page_number"),
                        rs.getString("text")
                ),
                pattern
        );
    }

    public record SearchResult(long chunkId, long documentId, String documentName, int page, String text) {}
}
