package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Repository
public class CalendarRepository {

    private final JdbcTemplate jdbc;

    public CalendarRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findAll() {
        return jdbc.queryForList("SELECT * FROM calendar_events ORDER BY event_date, start_time");
    }

    public List<Map<String, Object>> findBetween(String from, String to) {
        return jdbc.queryForList(
            "SELECT * FROM calendar_events WHERE event_date BETWEEN ? AND ? ORDER BY event_date, start_time",
            from, to);
    }

    public Map<String, Object> create(String title, String eventDate, String startTime,
                                       String endTime, String notes, String color) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO calendar_events (title, event_date, start_time, end_time, notes, color) VALUES (?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, title); ps.setString(2, eventDate);
            ps.setString(3, startTime); ps.setString(4, endTime);
            ps.setString(5, notes); ps.setString(6, color);
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM calendar_events WHERE id = ?",
            Objects.requireNonNull(kh.getKey(), "Insert did not return a generated key").longValue());
    }

    public Map<String, Object> update(long id, String title, String eventDate, String startTime,
                                       String endTime, String notes, String color) {
        jdbc.update("UPDATE calendar_events SET title=?, event_date=?, start_time=?, end_time=?, notes=?, color=? WHERE id=?",
            title, eventDate, startTime, endTime, notes, color, id);
        return jdbc.queryForMap("SELECT * FROM calendar_events WHERE id = ?", id);
    }

    public void delete(long id) { jdbc.update("DELETE FROM calendar_events WHERE id = ?", id); }
}
