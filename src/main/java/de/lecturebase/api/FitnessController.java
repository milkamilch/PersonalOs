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
@RequestMapping("/api/fitness")
public class FitnessController {

    private final JdbcTemplate jdbc;

    public FitnessController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping("/workouts")
    public List<Map<String, Object>> workouts(@RequestParam(defaultValue = "30") int limit) {
        List<Map<String, Object>> ws = jdbc.queryForList(
            "SELECT * FROM workouts ORDER BY workout_date DESC, id DESC LIMIT ?", limit);
        for (Map<String, Object> w : ws) {
            long wid = ((Number) w.get("id")).longValue();
            w.put("exercises", jdbc.queryForList(
                "SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY id", wid));
        }
        return ws;
    }

    @PostMapping("/workouts")
    public Map<String, Object> createWorkout(@RequestBody Map<String, Object> body) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO workouts (name, notes, workout_date) VALUES (?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, (String) body.getOrDefault("name", "Training"));
            ps.setString(2, (String) body.getOrDefault("notes", ""));
            ps.setString(3, (String) body.getOrDefault("workoutDate", LocalDate.now().toString()));
            return ps;
        }, kh);
        long id = kh.getKey().longValue();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> exercises = (List<Map<String, Object>>) body.getOrDefault("exercises", List.of());
        for (Map<String, Object> ex : exercises) {
            addExercise(id, ex);
        }

        Map<String, Object> w = jdbc.queryForMap("SELECT * FROM workouts WHERE id = ?", id);
        w.put("exercises", jdbc.queryForList(
            "SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY id", id));
        return w;
    }

    @PostMapping("/workouts/{id}/exercises")
    public Map<String, Object> addExerciseToWorkout(
            @PathVariable long id, @RequestBody Map<String, Object> body) {
        addExercise(id, body);
        Map<String, Object> w = jdbc.queryForMap("SELECT * FROM workouts WHERE id = ?", id);
        w.put("exercises", jdbc.queryForList(
            "SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY id", id));
        return w;
    }

    @DeleteMapping("/workouts/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM workouts WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        int totalWorkouts = Optional.ofNullable(
            jdbc.queryForObject("SELECT COUNT(*) FROM workouts", Integer.class)).orElse(0);
        int thisMonth = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM workouts WHERE strftime('%Y-%m', workout_date) = strftime('%Y-%m', 'now')",
            Integer.class)).orElse(0);
        int thisWeek = Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM workouts WHERE workout_date >= DATE('now', '-6 days')",
            Integer.class)).orElse(0);
        Map<String, Object> last = jdbc.queryForList(
            "SELECT workout_date FROM workouts ORDER BY workout_date DESC LIMIT 1")
            .stream().findFirst().orElse(Map.of());

        return Map.of(
            "totalWorkouts", totalWorkouts,
            "thisMonth", thisMonth,
            "thisWeek", thisWeek,
            "lastWorkout", last.getOrDefault("workout_date", "—")
        );
    }

    // ── Body weight ───────────────────────────────────────────────────────

    @GetMapping("/weight")
    public List<Map<String, Object>> weightLog(@RequestParam(defaultValue = "90") int days) {
        return jdbc.queryForList(
            "SELECT * FROM body_weight WHERE log_date >= DATE('now', ? || ' days') ORDER BY log_date ASC",
            "-" + days);
    }

    @PostMapping("/weight")
    public Map<String, Object> logWeight(@RequestBody Map<String, Object> body) {
        String date = (String) body.getOrDefault("logDate", LocalDate.now().toString());
        double kg   = ((Number) body.getOrDefault("weightKg", 0)).doubleValue();
        String note = (String) body.getOrDefault("note", "");
        jdbc.update("""
            INSERT INTO body_weight (weight_kg, log_date, note) VALUES (?,?,?)
            ON CONFLICT(log_date) DO UPDATE SET weight_kg=excluded.weight_kg, note=excluded.note
        """, kg, date, note);
        return jdbc.queryForMap("SELECT * FROM body_weight WHERE log_date=?", date);
    }

    @DeleteMapping("/weight/{id}")
    public Map<String, Object> deleteWeight(@PathVariable long id) {
        jdbc.update("DELETE FROM body_weight WHERE id=?", id);
        return Map.of("ok", true);
    }

    private void addExercise(long workoutId, Map<String, Object> ex) {
        jdbc.update("""
            INSERT INTO workout_exercises (workout_id, name, sets, reps, weight_kg, duration_min)
            VALUES (?,?,?,?,?,?)
        """,
            workoutId,
            ex.getOrDefault("name", "Übung"),
            ((Number) ex.getOrDefault("sets", 0)).intValue(),
            ((Number) ex.getOrDefault("reps", 0)).intValue(),
            ((Number) ex.getOrDefault("weightKg", 0)).doubleValue(),
            ((Number) ex.getOrDefault("durationMin", 0)).intValue());
    }
}
