package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final JdbcTemplate jdbc;

    public MediaController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        StringBuilder sql = new StringBuilder("SELECT * FROM media_items WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (type != null)   { sql.append(" AND type = ?");   params.add(type); }
        if (status != null) { sql.append(" AND status = ?"); params.add(status); }
        sql.append(" ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'want' THEN 1 ELSE 2 END, created_at DESC");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO media_items (type, title, creator, status, notes) VALUES (?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, (String) body.getOrDefault("type", "book"));
            ps.setString(2, (String) body.getOrDefault("title", ""));
            ps.setString(3, (String) body.getOrDefault("creator", ""));
            ps.setString(4, (String) body.getOrDefault("status", "want"));
            ps.setString(5, (String) body.getOrDefault("notes", ""));
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?", kh.getKey().longValue());
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> body) {
        if (body.containsKey("status")) {
            String status = (String) body.get("status");
            String finishedAt = "done".equals(status) ? java.time.LocalDate.now().toString() : null;
            jdbc.update("UPDATE media_items SET status=?, finished_at=? WHERE id=?",
                status, finishedAt, id);
        }
        if (body.containsKey("rating")) {
            Object r = body.get("rating");
            if (r == null) jdbc.update("UPDATE media_items SET rating=NULL WHERE id=?", id);
            else jdbc.update("UPDATE media_items SET rating=? WHERE id=?", ((Number) r).intValue(), id);
        }
        if (body.containsKey("notes")) {
            jdbc.update("UPDATE media_items SET notes=? WHERE id=?", body.get("notes"), id);
        }
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?", id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM media_items WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("booksRead",     count("book", "done"));
        r.put("booksReading",  count("book", "in_progress"));
        r.put("booksWant",     count("book", "want"));
        r.put("moviesWatched", count("movie", "done"));
        r.put("seriesWatching",count("series", "in_progress"));
        r.put("seriesWant",    count("series", "want") + count("movie", "want"));
        return r;
    }

    private int count(String type, String status) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM media_items WHERE type=? AND status=?",
            Integer.class, type, status)).orElse(0);
    }
}
