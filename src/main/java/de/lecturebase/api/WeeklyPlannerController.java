package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/planner-week")
public class WeeklyPlannerController {

    private final JdbcTemplate jdbc;

    public WeeklyPlannerController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ── Config ────────────────────────────────────────────────────────────────

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT * FROM weekly_planner_config WHERE id = 1");
        if (rows.isEmpty()) {
            return ResponseEntity.ok(Map.of());
        }
        return ResponseEntity.ok(rows.get(0));
    }

    @PutMapping("/config")
    public ResponseEntity<Void> saveConfig(@RequestBody Map<String, Object> body) {
        jdbc.update("""
            INSERT INTO weekly_planner_config
              (id, wake_time, routine_min, prog_hours, reading_min,
               uni_start, uni_end, uni_days, travel_uni_min, travel_gym_min,
               haushalt_min, haushalt_day, haushalt_start,
               study_hours, thesis_hours, study_block_min,
               phase, phase_week, bed_hour, bed_min)
            VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              wake_time       = excluded.wake_time,
              routine_min     = excluded.routine_min,
              prog_hours      = excluded.prog_hours,
              reading_min     = excluded.reading_min,
              uni_start       = excluded.uni_start,
              uni_end         = excluded.uni_end,
              uni_days        = excluded.uni_days,
              travel_uni_min  = excluded.travel_uni_min,
              travel_gym_min  = excluded.travel_gym_min,
              haushalt_min    = excluded.haushalt_min,
              haushalt_day    = excluded.haushalt_day,
              haushalt_start  = excluded.haushalt_start,
              study_hours     = excluded.study_hours,
              thesis_hours    = excluded.thesis_hours,
              study_block_min = excluded.study_block_min,
              phase           = excluded.phase,
              phase_week      = excluded.phase_week,
              bed_hour        = excluded.bed_hour,
              bed_min         = excluded.bed_min
            """,
            str(body, "wake_time", "06:00"),
            num(body, "routine_min", 30),
            num(body, "prog_hours", 2),
            num(body, "reading_min", 30),
            str(body, "uni_start", "10:00"),
            str(body, "uni_end", "16:00"),
            str(body, "uni_days", "1,2,3,4"),
            num(body, "travel_uni_min", 20),
            num(body, "travel_gym_min", 15),
            num(body, "haushalt_min", 60),
            num(body, "haushalt_day", 5),
            str(body, "haushalt_start", "10:00"),
            num(body, "study_hours", 0),
            num(body, "thesis_hours", 0),
            num(body, "study_block_min", 90),
            num(body, "phase", 1),
            num(body, "phase_week", 1),
            num(body, "bed_hour", 23),
            num(body, "bed_min", 0)
        );
        return ResponseEntity.ok().build();
    }

    // ── Fixed appointments ────────────────────────────────────────────────────

    @GetMapping("/appointments")
    public List<Map<String, Object>> getAppointments() {
        return jdbc.queryForList(
            "SELECT * FROM weekly_fixed_appointments ORDER BY day_index, start_min");
    }

    @PostMapping("/appointments")
    public ResponseEntity<Map<String, Object>> createAppointment(@RequestBody Map<String, Object> body) {
        String id = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        jdbc.update("""
            INSERT INTO weekly_fixed_appointments
              (appt_id, day_index, title, start_min, duration_min, travel_min)
            VALUES (?,?,?,?,?,?)
            """,
            id,
            num(body, "day_index", 0),
            str(body, "title", "Termin"),
            num(body, "start_min", 600),
            num(body, "duration_min", 60),
            num(body, "travel_min", 0)
        );
        return ResponseEntity.ok(Map.of("id", id));
    }

    @DeleteMapping("/appointments/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable String id) {
        jdbc.update("DELETE FROM weekly_fixed_appointments WHERE appt_id = ?", id);
        return ResponseEntity.ok().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String str(Map<String, Object> m, String key, String def) {
        Object v = m.get(key);
        return v != null ? v.toString() : def;
    }

    private int num(Map<String, Object> m, String key, int def) {
        Object v = m.get(key);
        if (v == null) return def;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return def; }
    }
}
