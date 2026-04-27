package de.lecturebase.storage;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class SummaryRepository {

    private final JdbcTemplate jdbc;

    public SummaryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(long documentId, String summary) {
        jdbc.update("""
            INSERT INTO summaries (document_id, summary)
            VALUES (?, ?)
            ON CONFLICT(document_id) DO UPDATE
                SET summary      = excluded.summary,
                    generated_at = CURRENT_TIMESTAMP
            """, documentId, summary);
    }

    public Optional<String> findByDocument(long documentId) {
        List<String> rows = jdbc.query(
            "SELECT summary FROM summaries WHERE document_id = ?",
            (rs, row) -> rs.getString("summary"),
            documentId
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }
}
