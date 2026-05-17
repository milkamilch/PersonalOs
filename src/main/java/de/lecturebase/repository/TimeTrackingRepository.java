package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class TimeTrackingRepository {

    private final JdbcTemplate jdbc;

    public TimeTrackingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findRecent(int days) {
        return jdbc.queryForList("""
            SELECT * FROM time_entries
            WHERE started_at >= DATE('now', ? || ' days') ORDER BY started_at DESC
        """, "-" + days);
    }

    public List<Map<String, Object>> findRecentByProject(int days, String project) {
        return jdbc.queryForList("""
            SELECT * FROM time_entries
            WHERE started_at >= DATE('now', ? || ' days') AND project = ?
            ORDER BY started_at DESC
        """, "-" + days, project);
    }

    public List<Map<String, Object>> findRunning() {
        return jdbc.queryForList(
            "SELECT * FROM time_entries WHERE stopped_at IS NULL ORDER BY started_at DESC LIMIT 1");
    }

    public void stopRunning() {
        jdbc.update("""
            UPDATE time_entries SET stopped_at=CURRENT_TIMESTAMP,
            duration_s = CAST((JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(started_at)) * 86400 AS INTEGER)
            WHERE stopped_at IS NULL
        """);
    }

    public void start(String project, String description, Long goalId) {
        if (goalId != null) {
            jdbc.update("INSERT INTO time_entries (project, description, goal_id, started_at) VALUES (?,?,?,CURRENT_TIMESTAMP)",
                project, description, goalId);
        } else {
            jdbc.update("INSERT INTO time_entries (project, description, started_at) VALUES (?,?,CURRENT_TIMESTAMP)",
                project, description);
        }
    }

    public Map<String, Object> findLatest() {
        return jdbc.queryForMap("SELECT * FROM time_entries ORDER BY id DESC LIMIT 1");
    }

    public List<Map<String, Object>> findLatestStopped() {
        return jdbc.queryForList(
            "SELECT * FROM time_entries WHERE stopped_at IS NOT NULL ORDER BY id DESC LIMIT 1");
    }

    public void delete(long id) { jdbc.update("DELETE FROM time_entries WHERE id=?", id); }

    public long sumSeconds(String fromDate) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s),0) FROM time_entries WHERE DATE(started_at)>=?",
            Long.class, fromDate)).orElse(0L);
    }

    public long sumSecondsOnDate(String date) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s),0) FROM time_entries WHERE DATE(started_at)=?",
            Long.class, date)).orElse(0L);
    }

    public List<Map<String, Object>> sumByProject(String fromDate) {
        return jdbc.queryForList("""
            SELECT project, SUM(duration_s) as total_s, COUNT(*) as entries
            FROM time_entries WHERE DATE(started_at) >= ?
            GROUP BY project ORDER BY total_s DESC
        """, fromDate);
    }
}
