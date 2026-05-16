package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public class NotesRepository {

    private final JdbcTemplate jdbc;

    public NotesRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findAll() {
        return jdbc.queryForList("SELECT * FROM quick_notes ORDER BY pinned DESC, updated_at DESC");
    }

    public Map<String, Object> create(String title, String content, String color) {
        jdbc.update("INSERT INTO quick_notes (title, content, color) VALUES (?, ?, ?)", title, content, color);
        return jdbc.queryForMap("SELECT * FROM quick_notes ORDER BY id DESC LIMIT 1");
    }

    public Map<String, Object> update(int id, Map<String, Object> body) {
        if (body.containsKey("title"))
            jdbc.update("UPDATE quick_notes SET title=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", body.get("title"), id);
        if (body.containsKey("content"))
            jdbc.update("UPDATE quick_notes SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", body.get("content"), id);
        if (body.containsKey("color"))
            jdbc.update("UPDATE quick_notes SET color=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", body.get("color"), id);
        if (body.containsKey("pinned"))
            jdbc.update("UPDATE quick_notes SET pinned=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", body.get("pinned"), id);
        return jdbc.queryForMap("SELECT * FROM quick_notes WHERE id=?", id);
    }

    public void delete(int id) { jdbc.update("DELETE FROM quick_notes WHERE id=?", id); }
}
