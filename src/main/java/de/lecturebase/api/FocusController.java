package de.lecturebase.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/focus")
public class FocusController {

    private final JdbcTemplate jdbc;

    public FocusController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @PostMapping("/session")
    public Map<String, Object> saveSession(@RequestBody Map<String, Object> body) {
        int durationS = body.containsKey("duration_s")
            ? ((Number) body.get("duration_s")).intValue()
            : 1500;
        String date = LocalDate.now().toString();
        jdbc.update(
            "INSERT INTO focus_sessions (duration_s, session_date) VALUES (?, ?)",
            durationS, date);
        return stats();
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        String today = LocalDate.now().toString();
        String weekStart = LocalDate.now().minusDays(6).toString();

        Integer todayCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM focus_sessions WHERE session_date = ?",
            Integer.class, today);
        Integer todaySeconds = jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s), 0) FROM focus_sessions WHERE session_date = ?",
            Integer.class, today);
        Integer weekCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM focus_sessions WHERE session_date >= ?",
            Integer.class, weekStart);
        Integer weekSeconds = jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s), 0) FROM focus_sessions WHERE session_date >= ?",
            Integer.class, weekStart);

        return Map.of(
            "today_count",   todayCount   != null ? todayCount   : 0,
            "today_seconds", todaySeconds != null ? todaySeconds : 0,
            "week_count",    weekCount    != null ? weekCount    : 0,
            "week_seconds",  weekSeconds  != null ? weekSeconds  : 0
        );
    }
}
