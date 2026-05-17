package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public class WeeklyPlannerRepository {

    private final JdbcTemplate jdbc;

    public WeeklyPlannerRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findConfig() {
        return jdbc.queryForList("SELECT * FROM weekly_planner_config WHERE id = 1");
    }

    public void saveConfig(Map<String, Object> body) {
        jdbc.update("""
            INSERT INTO weekly_planner_config
              (id, wake_time, routine_min, prog_hours, reading_min,
               uni_start, uni_end, uni_days, travel_uni_min, travel_gym_min,
               haushalt_min, haushalt_day, haushalt_start,
               study_hours, thesis_hours, study_block_min,
               phase, phase_week, bed_hour, bed_min)
            VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              wake_time=excluded.wake_time, routine_min=excluded.routine_min,
              prog_hours=excluded.prog_hours, reading_min=excluded.reading_min,
              uni_start=excluded.uni_start, uni_end=excluded.uni_end, uni_days=excluded.uni_days,
              travel_uni_min=excluded.travel_uni_min, travel_gym_min=excluded.travel_gym_min,
              haushalt_min=excluded.haushalt_min, haushalt_day=excluded.haushalt_day,
              haushalt_start=excluded.haushalt_start, study_hours=excluded.study_hours,
              thesis_hours=excluded.thesis_hours, study_block_min=excluded.study_block_min,
              phase=excluded.phase, phase_week=excluded.phase_week,
              bed_hour=excluded.bed_hour, bed_min=excluded.bed_min
            """,
            str(body,"wake_time","06:00"),  num(body,"routine_min",30),
            num(body,"prog_hours",2),        num(body,"reading_min",30),
            str(body,"uni_start","10:00"),   str(body,"uni_end","16:00"),
            str(body,"uni_days","1,2,3,4"),  num(body,"travel_uni_min",20),
            num(body,"travel_gym_min",15),   num(body,"haushalt_min",60),
            num(body,"haushalt_day",5),      str(body,"haushalt_start","10:00"),
            num(body,"study_hours",0),       num(body,"thesis_hours",0),
            num(body,"study_block_min",90),  num(body,"phase",1),
            num(body,"phase_week",1),        num(body,"bed_hour",23),
            num(body,"bed_min",0));
    }

    public List<Map<String, Object>> findAppointments() {
        return jdbc.queryForList(
            "SELECT * FROM weekly_fixed_appointments ORDER BY day_index, start_min");
    }

    public void createAppointment(String id, int dayIndex, String title,
                                   int startMin, int durationMin, int travelMin) {
        jdbc.update("""
            INSERT INTO weekly_fixed_appointments (appt_id, day_index, title, start_min, duration_min, travel_min)
            VALUES (?,?,?,?,?,?)
        """, id, dayIndex, title, startMin, durationMin, travelMin);
    }

    public void deleteAppointment(String id) {
        jdbc.update("DELETE FROM weekly_fixed_appointments WHERE appt_id = ?", id);
    }

    private String str(Map<String, Object> m, String key, String def) {
        Object v = m.get(key); return v != null ? v.toString() : def;
    }

    private int num(Map<String, Object> m, String key, int def) {
        Object v = m.get(key);
        if (v == null) return def;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return def; }
    }
}
