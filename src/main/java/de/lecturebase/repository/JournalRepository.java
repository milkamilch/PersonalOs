package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public class JournalRepository {

    private final JdbcTemplate jdbc;

    public JournalRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findAll(int limit) {
        return jdbc.queryForList(
            "SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT ?", limit);
    }

    public Map<String, Object> findByDate(String date) {
        return jdbc.queryForList("SELECT * FROM journal_entries WHERE entry_date = ?", date)
            .stream().findFirst()
            .orElse(Map.of("entry_date", date, "mood", 3, "content", "", "id", -1));
    }

    public Map<String, Object> upsert(String date, int mood, String content) {
        jdbc.update("""
            INSERT INTO journal_entries (entry_date, mood, content) VALUES (?, ?, ?)
            ON CONFLICT(entry_date) DO UPDATE SET mood=excluded.mood, content=excluded.content
        """, date, mood, content);
        return jdbc.queryForMap("SELECT * FROM journal_entries WHERE entry_date = ?", date);
    }

    public void delete(long id) {
        jdbc.update("DELETE FROM journal_entries WHERE id = ?", id);
    }

    public List<Map<String, Object>> moodTrend() {
        return jdbc.queryForList("""
            SELECT entry_date, mood FROM journal_entries
            ORDER BY entry_date DESC LIMIT 30
        """);
    }
}
