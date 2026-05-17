package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.*;

@Repository
public class FitnessRepository {

    private final JdbcTemplate jdbc;

    public FitnessRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findWorkouts(int limit) {
        List<Map<String, Object>> ws = jdbc.queryForList(
            "SELECT * FROM workouts ORDER BY workout_date DESC, id DESC LIMIT ?", limit);
        for (Map<String, Object> w : ws) {
            long wid = ((Number) w.get("id")).longValue();
            w.put("exercises", jdbc.queryForList(
                "SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY id", wid));
        }
        return ws;
    }

    public long createWorkout(String name, String notes, String date) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO workouts (name, notes, workout_date) VALUES (?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name); ps.setString(2, notes); ps.setString(3, date);
            return ps;
        }, kh);
        return Objects.requireNonNull(kh.getKey(), "Insert did not return a generated key").longValue();
    }

    public void addExercise(long workoutId, String name, int sets, int reps,
                             double weightKg, int durationMin) {
        jdbc.update("""
            INSERT INTO workout_exercises (workout_id, name, sets, reps, weight_kg, duration_min)
            VALUES (?,?,?,?,?,?)
        """, workoutId, name, sets, reps, weightKg, durationMin);
    }

    public Map<String, Object> findWorkoutWithExercises(long id) {
        Map<String, Object> w = jdbc.queryForMap("SELECT * FROM workouts WHERE id = ?", id);
        w.put("exercises", jdbc.queryForList(
            "SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY id", id));
        return w;
    }

    public void deleteWorkout(long id) { jdbc.update("DELETE FROM workouts WHERE id = ?", id); }

    public int countWorkouts() {
        return Optional.ofNullable(jdbc.queryForObject("SELECT COUNT(*) FROM workouts", Integer.class)).orElse(0);
    }

    public int countWorkoutsThisMonth() {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM workouts WHERE strftime('%Y-%m', workout_date) = strftime('%Y-%m', 'now')",
            Integer.class)).orElse(0);
    }

    public int countWorkoutsThisWeek() {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM workouts WHERE workout_date >= DATE('now', '-6 days')",
            Integer.class)).orElse(0);
    }

    public String lastWorkoutDate() {
        return jdbc.queryForList("SELECT workout_date FROM workouts ORDER BY workout_date DESC LIMIT 1")
            .stream().findFirst().map(r -> (String) r.get("workout_date")).orElse("—");
    }

    public List<Map<String, Object>> findWeightLog(int days) {
        return jdbc.queryForList(
            "SELECT * FROM body_weight WHERE log_date >= DATE('now', ? || ' days') ORDER BY log_date ASC",
            "-" + days);
    }

    public Map<String, Object> logWeight(String date, double kg, String note) {
        jdbc.update("""
            INSERT INTO body_weight (weight_kg, log_date, note) VALUES (?,?,?)
            ON CONFLICT(log_date) DO UPDATE SET weight_kg=excluded.weight_kg, note=excluded.note
        """, kg, date, note);
        return jdbc.queryForMap("SELECT * FROM body_weight WHERE log_date=?", date);
    }

    public void deleteWeight(long id) { jdbc.update("DELETE FROM body_weight WHERE id=?", id); }
}
