package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar")
public class CalendarController {

    private final JdbcTemplate jdbc;

    public CalendarController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping("/events")
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        if (from != null && to != null) {
            return jdbc.queryForList(
                "SELECT * FROM calendar_events WHERE event_date BETWEEN ? AND ? ORDER BY event_date, start_time",
                from, to);
        }
        return jdbc.queryForList("SELECT * FROM calendar_events ORDER BY event_date, start_time");
    }

    @PostMapping("/events")
    public Map<String, Object> create(@RequestBody Map<String, String> body) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO calendar_events (title, event_date, start_time, end_time, notes, color) VALUES (?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, body.getOrDefault("title", ""));
            ps.setString(2, body.getOrDefault("event_date", ""));
            ps.setString(3, body.get("start_time"));
            ps.setString(4, body.get("end_time"));
            ps.setString(5, body.getOrDefault("notes", ""));
            ps.setString(6, body.getOrDefault("color", "#0a84ff"));
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM calendar_events WHERE id = ?", kh.getKey().longValue());
    }

    @PatchMapping("/events/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, String> body) {
        jdbc.update("UPDATE calendar_events SET title=?, event_date=?, start_time=?, end_time=?, notes=?, color=? WHERE id=?",
            body.getOrDefault("title", ""),
            body.getOrDefault("event_date", ""),
            body.get("start_time"),
            body.get("end_time"),
            body.getOrDefault("notes", ""),
            body.getOrDefault("color", "#0a84ff"),
            id);
        return jdbc.queryForMap("SELECT * FROM calendar_events WHERE id = ?", id);
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM calendar_events WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
