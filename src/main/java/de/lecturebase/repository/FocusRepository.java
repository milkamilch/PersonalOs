package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public class FocusRepository {

    private final JdbcTemplate jdbc;

    public FocusRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void saveSession(int durationS, String date) {
        jdbc.update("INSERT INTO focus_sessions (duration_s, session_date) VALUES (?, ?)", durationS, date);
    }

    public int countSessions(String date) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM focus_sessions WHERE session_date = ?", Integer.class, date)).orElse(0);
    }

    public int sumSeconds(String fromDate) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s), 0) FROM focus_sessions WHERE session_date >= ?",
            Integer.class, fromDate)).orElse(0);
    }

    public int sumSecondsOnDate(String date) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s), 0) FROM focus_sessions WHERE session_date = ?",
            Integer.class, date)).orElse(0);
    }

    public int countSessionsSince(String fromDate) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM focus_sessions WHERE session_date >= ?",
            Integer.class, fromDate)).orElse(0);
    }
}
