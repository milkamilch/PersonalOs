package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ReadingRepository {

    private final JdbcTemplate jdbc;

    public ReadingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findByMedia(int mediaId) {
        return jdbc.queryForList("""
            SELECT rs.*, mi.title as book_title FROM reading_sessions rs
            JOIN media_items mi ON mi.id = rs.media_id
            WHERE rs.media_id = ? ORDER BY rs.session_date DESC
        """, mediaId);
    }

    public List<Map<String, Object>> findRecent(int days) {
        return jdbc.queryForList("""
            SELECT rs.*, mi.title as book_title FROM reading_sessions rs
            JOIN media_items mi ON mi.id = rs.media_id
            WHERE rs.session_date >= DATE('now', ? || ' days')
            ORDER BY rs.session_date DESC, rs.id DESC
        """, "-" + days);
    }

    public Map<String, Object> log(int mediaId, int pages, int minutes, String date, String note) {
        jdbc.update("""
            INSERT INTO reading_sessions (media_id, pages_read, minutes, session_date, note)
            VALUES (?,?,?,?,?)
        """, mediaId, pages, minutes, date, note);
        return jdbc.queryForMap("SELECT * FROM reading_sessions ORDER BY id DESC LIMIT 1");
    }

    public void delete(long id) { jdbc.update("DELETE FROM reading_sessions WHERE id=?", id); }

    public long sumMinutes(String fromDate) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(minutes),0) FROM reading_sessions WHERE session_date>=?",
            Long.class, fromDate)).orElse(0L);
    }

    public long sumMinutesOnDate(String date) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(minutes),0) FROM reading_sessions WHERE session_date=?",
            Long.class, date)).orElse(0L);
    }

    public long sumPages(String fromDate) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(pages_read),0) FROM reading_sessions WHERE session_date>=?",
            Long.class, fromDate)).orElse(0L);
    }

    public List<String> findDistinctDatesDesc() {
        return jdbc.queryForList(
            "SELECT DISTINCT session_date FROM reading_sessions ORDER BY session_date DESC",
            String.class);
    }
}
