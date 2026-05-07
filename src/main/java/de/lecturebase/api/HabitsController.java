package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/habits")
public class HabitsController {

    private final JdbcTemplate jdbc;

    public HabitsController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public List<Map<String, Object>> list() {
        String today = LocalDate.now().toString();
        return jdbc.queryForList("""
            SELECT h.id, h.name, h.icon, h.color, h.sort_order,
                   CASE WHEN e.habit_id IS NOT NULL THEN 1 ELSE 0 END as done_today,
                   (SELECT COUNT(*) FROM habit_entries WHERE habit_id = h.id) as total_done
            FROM habits h
            LEFT JOIN habit_entries e ON e.habit_id = h.id AND e.entry_date = ?
            ORDER BY h.sort_order, h.id
        """, today);
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, String> body) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO habits (name, icon, color) VALUES (?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, body.getOrDefault("name", "Habit"));
            ps.setString(2, body.getOrDefault("icon", "✓"));
            ps.setString(3, body.getOrDefault("color", "#7c3aed"));
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM habits WHERE id = ?", kh.getKey().longValue());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM habits WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/{id}/toggle")
    public Map<String, Object> toggle(@PathVariable long id) {
        String today = LocalDate.now().toString();
        int existing = jdbc.queryForObject(
            "SELECT COUNT(*) FROM habit_entries WHERE habit_id = ? AND entry_date = ?",
            Integer.class, id, today);
        if (existing > 0) {
            jdbc.update("DELETE FROM habit_entries WHERE habit_id = ? AND entry_date = ?", id, today);
        } else {
            jdbc.update("INSERT OR IGNORE INTO habit_entries (habit_id, entry_date) VALUES (?, ?)", id, today);
        }
        return Map.of("done", existing == 0);
    }

    @GetMapping("/streak/{id}")
    public Map<String, Object> streak(@PathVariable long id) {
        List<String> dates = jdbc.queryForList(
            "SELECT entry_date FROM habit_entries WHERE habit_id = ? ORDER BY entry_date DESC",
            String.class, id);
        int streak = 0;
        LocalDate cursor = LocalDate.now();
        for (String d : dates) {
            if (LocalDate.parse(d).equals(cursor)) {
                streak++;
                cursor = cursor.minusDays(1);
            } else break;
        }
        return Map.of("streak", streak, "total", dates.size());
    }

    @GetMapping("/week")
    public List<Map<String, Object>> week() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            String date = today.minusDays(i).toString();
            int count = jdbc.queryForObject(
                "SELECT COUNT(DISTINCT habit_id) FROM habit_entries WHERE entry_date = ?",
                Integer.class, date);
            int total = jdbc.queryForObject("SELECT COUNT(*) FROM habits", Integer.class);
            result.add(Map.of("date", date, "done", count, "total", total));
        }
        return result;
    }
}
