package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/journal")
public class JournalController {

    private final JdbcTemplate jdbc;

    public JournalController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "30") int limit) {
        return jdbc.queryForList(
            "SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT ?", limit);
    }

    @GetMapping("/today")
    public Map<String, Object> today() {
        String today = LocalDate.now().toString();
        return jdbc.queryForList(
            "SELECT * FROM journal_entries WHERE entry_date = ?", today)
            .stream().findFirst()
            .orElse(Map.of("entry_date", today, "mood", 3, "content", "", "id", -1));
    }

    @PostMapping
    public Map<String, Object> upsert(@RequestBody Map<String, Object> body) {
        String date = (String) body.getOrDefault("entryDate", LocalDate.now().toString());
        int mood = ((Number) body.getOrDefault("mood", 3)).intValue();
        String content = (String) body.getOrDefault("content", "");

        jdbc.update("""
            INSERT INTO journal_entries (entry_date, mood, content)
            VALUES (?, ?, ?)
            ON CONFLICT(entry_date) DO UPDATE SET mood=excluded.mood, content=excluded.content
        """, date, mood, content);

        return jdbc.queryForMap("SELECT * FROM journal_entries WHERE entry_date = ?", date);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM journal_entries WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/mood-trend")
    public List<Map<String, Object>> moodTrend() {
        return jdbc.queryForList("""
            SELECT entry_date, mood FROM journal_entries
            ORDER BY entry_date DESC LIMIT 30
        """);
    }
}
