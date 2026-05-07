package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.*;

@RestController
@RequestMapping("/api/goals")
public class GoalsController {

    private final JdbcTemplate jdbc;

    public GoalsController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String horizon,
            @RequestParam(required = false) String status) {
        StringBuilder sql = new StringBuilder("SELECT * FROM goals WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (horizon != null) { sql.append(" AND horizon = ?"); params.add(horizon); }
        if (status  != null) { sql.append(" AND status = ?");  params.add(status); }
        sql.append(" ORDER BY CASE horizon WHEN 'week' THEN 0 WHEN 'month' THEN 1 WHEN 'year' THEN 2 ELSE 3 END, created_at DESC");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO goals (title, description, horizon, target_date) VALUES (?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, (String) body.getOrDefault("title", "Ziel"));
            ps.setString(2, (String) body.getOrDefault("description", ""));
            ps.setString(3, (String) body.getOrDefault("horizon", "month"));
            Object td = body.get("targetDate");
            if (td != null) ps.setString(4, (String) td); else ps.setNull(4, java.sql.Types.VARCHAR);
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM goals WHERE id = ?", kh.getKey().longValue());
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> body) {
        if (body.containsKey("progress")) {
            jdbc.update("UPDATE goals SET progress=? WHERE id=?",
                ((Number) body.get("progress")).intValue(), id);
        }
        if (body.containsKey("status")) {
            jdbc.update("UPDATE goals SET status=? WHERE id=?", body.get("status"), id);
        }
        if (body.containsKey("title")) {
            jdbc.update("UPDATE goals SET title=? WHERE id=?", body.get("title"), id);
        }
        if (body.containsKey("description")) {
            jdbc.update("UPDATE goals SET description=? WHERE id=?", body.get("description"), id);
        }
        return jdbc.queryForMap("SELECT * FROM goals WHERE id = ?", id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM goals WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
