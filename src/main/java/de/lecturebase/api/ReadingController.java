package de.lecturebase.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/reading")
public class ReadingController {

    private final JdbcTemplate jdbc;

    public ReadingController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping("/sessions")
    public List<Map<String, Object>> sessions(
            @RequestParam(required = false) Integer mediaId,
            @RequestParam(defaultValue = "30") int days) {
        if (mediaId != null) {
            return jdbc.queryForList("""
                SELECT rs.*, mi.title as book_title FROM reading_sessions rs
                JOIN media_items mi ON mi.id = rs.media_id
                WHERE rs.media_id = ?
                ORDER BY rs.session_date DESC
            """, mediaId);
        }
        return jdbc.queryForList("""
            SELECT rs.*, mi.title as book_title FROM reading_sessions rs
            JOIN media_items mi ON mi.id = rs.media_id
            WHERE rs.session_date >= DATE('now', ? || ' days')
            ORDER BY rs.session_date DESC, rs.id DESC
        """, "-" + days);
    }

    @PostMapping("/sessions")
    public Map<String, Object> log(@RequestBody Map<String, Object> body) {
        int mediaId   = ((Number) body.get("mediaId")).intValue();
        int pages     = ((Number) body.getOrDefault("pagesRead", 0)).intValue();
        int minutes   = ((Number) body.getOrDefault("minutes", 0)).intValue();
        String date   = (String) body.getOrDefault("sessionDate", LocalDate.now().toString());
        String note   = (String) body.getOrDefault("note", "");
        jdbc.update("""
            INSERT INTO reading_sessions (media_id, pages_read, minutes, session_date, note)
            VALUES (?,?,?,?,?)
        """, mediaId, pages, minutes, date, note);
        return jdbc.queryForMap("SELECT * FROM reading_sessions ORDER BY id DESC LIMIT 1");
    }

    @DeleteMapping("/sessions/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM reading_sessions WHERE id=?", id);
        return Map.of("ok", true);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        String today = LocalDate.now().toString();
        String week  = LocalDate.now().minusDays(6).toString();
        String month = LocalDate.now().withDayOfMonth(1).toString();

        long todayMin = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(minutes),0) FROM reading_sessions WHERE session_date=?",
            Long.class, today)).orElse(0L);
        long weekMin = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(minutes),0) FROM reading_sessions WHERE session_date>=?",
            Long.class, week)).orElse(0L);
        long weekPages = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(pages_read),0) FROM reading_sessions WHERE session_date>=?",
            Long.class, week)).orElse(0L);
        int streak = calcStreak();

        return Map.of("todayMin", todayMin, "weekMin", weekMin, "weekPages", weekPages, "streak", streak);
    }

    private int calcStreak() {
        List<String> dates = jdbc.queryForList(
            "SELECT DISTINCT session_date FROM reading_sessions ORDER BY session_date DESC",
            String.class);
        if (dates.isEmpty()) return 0;
        int streak = 0;
        LocalDate expected = LocalDate.now();
        for (String d : dates) {
            LocalDate date = LocalDate.parse(d);
            if (!date.equals(expected)) break;
            streak++;
            expected = expected.minusDays(1);
        }
        return streak;
    }
}
