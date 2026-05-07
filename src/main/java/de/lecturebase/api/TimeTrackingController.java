package de.lecturebase.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/time")
public class TimeTrackingController {

    private final JdbcTemplate jdbc;

    public TimeTrackingController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) String project) {
        if (project != null && !project.isBlank()) {
            return jdbc.queryForList("""
                SELECT * FROM time_entries
                WHERE started_at >= DATE('now', ? || ' days') AND project = ?
                ORDER BY started_at DESC
            """, "-" + days, project);
        }
        return jdbc.queryForList("""
            SELECT * FROM time_entries
            WHERE started_at >= DATE('now', ? || ' days')
            ORDER BY started_at DESC
        """, "-" + days);
    }

    @GetMapping("/running")
    public Map<String, Object> running() {
        List<Map<String, Object>> r = jdbc.queryForList(
            "SELECT * FROM time_entries WHERE stopped_at IS NULL ORDER BY started_at DESC LIMIT 1");
        if (r.isEmpty()) return Map.of("running", false);
        Map<String, Object> entry = new HashMap<>(r.get(0));
        entry.put("running", true);
        return entry;
    }

    @PostMapping("/start")
    public Map<String, Object> start(@RequestBody Map<String, Object> body) {
        // Stop any running entry first
        jdbc.update("""
            UPDATE time_entries SET stopped_at=CURRENT_TIMESTAMP,
            duration_s = CAST((JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(started_at)) * 86400 AS INTEGER)
            WHERE stopped_at IS NULL
        """);
        String project = (String) body.getOrDefault("project", "");
        String desc    = (String) body.getOrDefault("description", "");
        Object gid     = body.get("goal_id");
        Long goalId    = gid != null ? ((Number) gid).longValue() : null;
        if (goalId != null) {
            jdbc.update("INSERT INTO time_entries (project, description, goal_id, started_at) VALUES (?,?,?,CURRENT_TIMESTAMP)",
                project, desc, goalId);
        } else {
            jdbc.update("INSERT INTO time_entries (project, description, started_at) VALUES (?,?,CURRENT_TIMESTAMP)",
                project, desc);
        }
        return jdbc.queryForMap("SELECT * FROM time_entries ORDER BY id DESC LIMIT 1");
    }

    @PostMapping("/stop")
    public Map<String, Object> stop() {
        jdbc.update("""
            UPDATE time_entries SET stopped_at=CURRENT_TIMESTAMP,
            duration_s = CAST((JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(started_at)) * 86400 AS INTEGER)
            WHERE stopped_at IS NULL
        """);
        List<Map<String, Object>> r = jdbc.queryForList(
            "SELECT * FROM time_entries WHERE stopped_at IS NOT NULL ORDER BY id DESC LIMIT 1");
        return r.isEmpty() ? Map.of("ok", true) : r.get(0);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM time_entries WHERE id=?", id);
        return Map.of("ok", true);
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        String today = LocalDate.now().toString();
        String week  = LocalDate.now().minusDays(6).toString();
        String month = LocalDate.now().withDayOfMonth(1).toString();

        long todayS = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s),0) FROM time_entries WHERE DATE(started_at)=?",
            Long.class, today)).orElse(0L);
        long weekS = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s),0) FROM time_entries WHERE DATE(started_at)>=?",
            Long.class, week)).orElse(0L);
        long monthS = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s),0) FROM time_entries WHERE DATE(started_at)>=?",
            Long.class, month)).orElse(0L);

        List<Map<String, Object>> byProject = jdbc.queryForList("""
            SELECT project, SUM(duration_s) as total_s, COUNT(*) as entries
            FROM time_entries WHERE DATE(started_at) >= ?
            GROUP BY project ORDER BY total_s DESC
        """, week);

        return Map.of(
            "todayS", todayS,
            "weekS", weekS,
            "monthS", monthS,
            "byProject", byProject
        );
    }
}
