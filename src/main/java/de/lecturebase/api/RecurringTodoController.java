package de.lecturebase.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.*;

@RestController
@RequestMapping("/api/recurring-todos")
public class RecurringTodoController {

    private final JdbcTemplate jdbc;

    public RecurringTodoController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Returns all recurring templates with today's done status */
    @GetMapping
    public List<Map<String, Object>> list() {
        String today = LocalDate.now().toString();
        List<Map<String, Object>> items = jdbc.queryForList(
            "SELECT * FROM recurring_todos WHERE active=1 ORDER BY id");
        for (Map<String, Object> item : items) {
            long id = ((Number) item.get("id")).longValue();
            int done = Optional.ofNullable(jdbc.queryForObject(
                "SELECT COUNT(*) FROM recurring_todo_done WHERE recurring_id=? AND done_date=?",
                Integer.class, id, today)).orElse(0);
            item.put("done_today", done > 0);

            // For weekly: show day name
            String rec = (String) item.get("recurrence");
            if (rec != null && rec.startsWith("weekly:")) {
                item.put("recurrence_label", "Wöchentlich · " + dayName(rec.substring(7)));
            } else {
                item.put("recurrence_label", "Täglich");
            }

            // Is it due today?
            item.put("due_today", isDueToday(rec));
        }
        return items;
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        String text = (String) body.getOrDefault("text", "");
        String rec  = (String) body.getOrDefault("recurrence", "daily");
        jdbc.update("INSERT INTO recurring_todos (text, recurrence) VALUES (?,?)", text, rec);
        return jdbc.queryForMap("SELECT * FROM recurring_todos ORDER BY id DESC LIMIT 1");
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM recurring_todos WHERE id=?", id);
        return Map.of("ok", true);
    }

    @PostMapping("/{id}/toggle")
    public Map<String, Object> toggle(@PathVariable long id) {
        String today = LocalDate.now().toString();
        int done = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM recurring_todo_done WHERE recurring_id=? AND done_date=?",
            Integer.class, id, today)).orElse(0);
        if (done > 0) {
            jdbc.update("DELETE FROM recurring_todo_done WHERE recurring_id=? AND done_date=?", id, today);
        } else {
            jdbc.update("INSERT OR IGNORE INTO recurring_todo_done (recurring_id, done_date) VALUES (?,?)", id, today);
        }
        return Map.of("done", done == 0);
    }

    private boolean isDueToday(String recurrence) {
        if (recurrence == null || recurrence.equals("daily")) return true;
        if (recurrence.startsWith("weekly:")) {
            String day = recurrence.substring(7).toUpperCase();
            try {
                DayOfWeek target = DayOfWeek.valueOf(day);
                return LocalDate.now().getDayOfWeek() == target;
            } catch (IllegalArgumentException e) { return true; }
        }
        return true;
    }

    private String dayName(String day) {
        return switch (day.toUpperCase()) {
            case "MONDAY"    -> "Mo";
            case "TUESDAY"   -> "Di";
            case "WEDNESDAY" -> "Mi";
            case "THURSDAY"  -> "Do";
            case "FRIDAY"    -> "Fr";
            case "SATURDAY"  -> "Sa";
            case "SUNDAY"    -> "So";
            default -> day;
        };
    }
}
