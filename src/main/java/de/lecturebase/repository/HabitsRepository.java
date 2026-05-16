package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Repository
public class HabitsRepository {

    private final JdbcTemplate jdbc;

    public HabitsRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findAllWithTodayStatus(String today) {
        return jdbc.queryForList("""
            SELECT h.id, h.name, h.icon, h.color, h.sort_order,
                   CASE WHEN e.habit_id IS NOT NULL THEN 1 ELSE 0 END as done_today,
                   (SELECT COUNT(*) FROM habit_entries WHERE habit_id = h.id) as total_done
            FROM habits h
            LEFT JOIN habit_entries e ON e.habit_id = h.id AND e.entry_date = ?
            ORDER BY h.sort_order, h.id
        """, today);
    }

    public Map<String, Object> create(String name, String icon, String color) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO habits (name, icon, color) VALUES (?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name);
            ps.setString(2, icon);
            ps.setString(3, color);
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM habits WHERE id = ?", kh.getKey().longValue());
    }

    public void delete(long id) {
        jdbc.update("DELETE FROM habits WHERE id = ?", id);
    }

    public int countEntryToday(long id, String today) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM habit_entries WHERE habit_id = ? AND entry_date = ?",
            Integer.class, id, today);
    }

    public void addEntry(long id, String today) {
        jdbc.update("INSERT OR IGNORE INTO habit_entries (habit_id, entry_date) VALUES (?, ?)", id, today);
    }

    public void removeEntry(long id, String today) {
        jdbc.update("DELETE FROM habit_entries WHERE habit_id = ? AND entry_date = ?", id, today);
    }

    public List<String> findAllEntryDates(long id) {
        return jdbc.queryForList(
            "SELECT entry_date FROM habit_entries WHERE habit_id = ? ORDER BY entry_date DESC",
            String.class, id);
    }

    public int countHabits() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM habits", Integer.class);
    }

    public int countEntriesOnDate(String date) {
        return jdbc.queryForObject(
            "SELECT COUNT(DISTINCT habit_id) FROM habit_entries WHERE entry_date = ?",
            Integer.class, date);
    }

    public List<Map<String, Object>> findHeatmapEntries(int days) {
        return jdbc.queryForList("""
            SELECT entry_date, COUNT(DISTINCT habit_id) as done
            FROM habit_entries
            WHERE entry_date >= DATE('now', ? || ' days')
            GROUP BY entry_date
        """, "-" + days);
    }
}
