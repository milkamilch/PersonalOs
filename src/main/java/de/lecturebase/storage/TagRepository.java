package de.lecturebase.storage;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class TagRepository {

    private final JdbcTemplate jdbc;

    public TagRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long getOrCreate(String name) {
        jdbc.update("INSERT OR IGNORE INTO tags (name) VALUES (?)", name);
        return jdbc.queryForObject("SELECT id FROM tags WHERE name = ?", Long.class, name);
    }

    public void assignToDocument(long documentId, long tagId) {
        jdbc.update(
            "INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)",
            documentId, tagId
        );
    }

    public void removeFromDocument(long documentId, String tagName) {
        jdbc.update("""
            DELETE FROM document_tags
            WHERE document_id = ?
              AND tag_id = (SELECT id FROM tags WHERE name = ?)
            """, documentId, tagName);
    }

    public List<String> findAll() {
        return jdbc.queryForList("SELECT name FROM tags ORDER BY name", String.class);
    }
}
