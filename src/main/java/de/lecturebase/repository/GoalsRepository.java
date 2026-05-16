package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Repository
public class GoalsRepository {

    private final JdbcTemplate jdbc;

    public GoalsRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findAll(String horizon, String status) {
        StringBuilder sql = new StringBuilder("SELECT * FROM goals WHERE 1=1");
        List<Object> params = new java.util.ArrayList<>();
        if (horizon != null) { sql.append(" AND horizon = ?"); params.add(horizon); }
        if (status  != null) { sql.append(" AND status = ?");  params.add(status); }
        sql.append(" ORDER BY CASE horizon WHEN 'week' THEN 0 WHEN 'month' THEN 1 WHEN 'year' THEN 2 ELSE 3 END, created_at DESC");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    public Map<String, Object> create(String title, String description, String horizon, String targetDate) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO goals (title, description, horizon, target_date) VALUES (?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, title);
            ps.setString(2, description);
            ps.setString(3, horizon);
            if (targetDate != null) ps.setString(4, targetDate);
            else ps.setNull(4, java.sql.Types.VARCHAR);
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM goals WHERE id = ?",
            Objects.requireNonNull(kh.getKey(), "Insert did not return a generated key").longValue());
    }

    public Map<String, Object> update(long id, Map<String, Object> fields) {
        if (fields.containsKey("progress"))
            jdbc.update("UPDATE goals SET progress=? WHERE id=?", ((Number) fields.get("progress")).intValue(), id);
        if (fields.containsKey("status"))
            jdbc.update("UPDATE goals SET status=? WHERE id=?", fields.get("status"), id);
        if (fields.containsKey("title"))
            jdbc.update("UPDATE goals SET title=? WHERE id=?", fields.get("title"), id);
        if (fields.containsKey("description"))
            jdbc.update("UPDATE goals SET description=? WHERE id=?", fields.get("description"), id);
        return jdbc.queryForMap("SELECT * FROM goals WHERE id = ?", id);
    }

    public void delete(long id) { jdbc.update("DELETE FROM goals WHERE id = ?", id); }

    public List<Map<String, Object>> findTodos(long id) {
        return jdbc.queryForList(
            "SELECT * FROM todos WHERE goal_id = ? ORDER BY done ASC, created_at DESC", id);
    }

    public int totalTimeSeconds(long id) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COALESCE(SUM(duration_s), 0) FROM time_entries WHERE goal_id = ? AND duration_s IS NOT NULL",
            Integer.class, id)).orElse(0);
    }
}
