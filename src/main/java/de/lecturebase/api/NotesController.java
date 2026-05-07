package de.lecturebase.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notes")
public class NotesController {

    private final JdbcTemplate jdbc;

    public NotesController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbc.queryForList(
            "SELECT * FROM quick_notes ORDER BY pinned DESC, updated_at DESC"
        );
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        String title   = (String) body.getOrDefault("title", "");
        String content = (String) body.getOrDefault("content", "");
        String color   = (String) body.getOrDefault("color", "default");
        jdbc.update(
            "INSERT INTO quick_notes (title, content, color) VALUES (?, ?, ?)",
            title, content, color
        );
        return jdbc.queryForMap("SELECT * FROM quick_notes ORDER BY id DESC LIMIT 1");
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable int id, @RequestBody Map<String, Object> body) {
        if (body.containsKey("title"))   jdbc.update("UPDATE quick_notes SET title=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",   body.get("title"),   id);
        if (body.containsKey("content")) jdbc.update("UPDATE quick_notes SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", body.get("content"), id);
        if (body.containsKey("color"))   jdbc.update("UPDATE quick_notes SET color=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",   body.get("color"),   id);
        if (body.containsKey("pinned"))  jdbc.update("UPDATE quick_notes SET pinned=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",  body.get("pinned"),  id);
        return jdbc.queryForMap("SELECT * FROM quick_notes WHERE id=?", id);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable int id) {
        jdbc.update("DELETE FROM quick_notes WHERE id=?", id);
        return Map.of("ok", true);
    }
}
