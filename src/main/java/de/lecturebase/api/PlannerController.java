package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/planner")
public class PlannerController {

    private final JdbcTemplate jdbc;

    public PlannerController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbc.query("""
            SELECT sp.*, d.name as doc_name
            FROM study_plans sp
            JOIN documents d ON d.id = sp.document_id
            ORDER BY sp.exam_date
            """, (rs, row) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            long planId    = rs.getLong("id");
            String examDate = rs.getString("exam_date");
            int totalPages  = rs.getInt("total_pages");
            int pagesDone   = rs.getInt("pages_done");
            long daysLeft   = ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(examDate));
            int pagesLeft   = Math.max(0, totalPages - pagesDone);
            double dailyGoal = daysLeft > 0 ? Math.ceil((double) pagesLeft / daysLeft) : pagesLeft;

            // Today's log
            Integer todayDone = jdbc.queryForObject(
                "SELECT COALESCE(SUM(pages_done),0) FROM study_log WHERE plan_id=? AND log_date=DATE('now')",
                Integer.class, planId);

            m.put("id",          planId);
            m.put("documentId",  rs.getLong("document_id"));
            m.put("docName",     rs.getString("doc_name"));
            m.put("examDate",    examDate);
            m.put("totalPages",  totalPages);
            m.put("pagesDone",   pagesDone);
            m.put("daysLeft",    daysLeft);
            m.put("dailyGoal",   (int) dailyGoal);
            m.put("todayDone",   todayDone != null ? todayDone : 0);
            m.put("pct",         totalPages > 0 ? (int)(pagesDone * 100.0 / totalPages) : 0);
            return m;
        });
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @RequestParam long documentId,
            @RequestParam String examDate,
            @RequestParam int totalPages) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO study_plans (document_id, exam_date, total_pages) VALUES (?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, documentId);
            ps.setString(2, examDate);
            ps.setInt(3, totalPages);
            return ps;
        }, kh);
        return ResponseEntity.ok(Map.of("id", kh.getKey().longValue(), "status", "created"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM study_log WHERE plan_id = ?", id);
        jdbc.update("DELETE FROM study_plans WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    /** Log pages studied today */
    @PostMapping("/{id}/log")
    public ResponseEntity<Map<String, Object>> log(
            @PathVariable long id,
            @RequestParam int pages) {
        // upsert today's log
        jdbc.update("""
            INSERT INTO study_log (plan_id, log_date, pages_done) VALUES (?, DATE('now'), ?)
            ON CONFLICT(plan_id, log_date) DO UPDATE SET pages_done = pages_done + excluded.pages_done
            """, id, pages);
        // update total pages_done on plan
        jdbc.update("UPDATE study_plans SET pages_done = pages_done + ? WHERE id = ?", pages, id);
        return ResponseEntity.ok(Map.of("status", "logged", "pages", pages));
    }

    /** Weekly progress for chart */
    @GetMapping("/{id}/history")
    public List<Map<String, Object>> history(@PathVariable long id) {
        return jdbc.query("""
            SELECT log_date, SUM(pages_done) as pages
            FROM study_log WHERE plan_id = ?
            GROUP BY log_date ORDER BY log_date DESC LIMIT 14
            """, (rs, row) -> Map.of(
            "date",  rs.getString("log_date"),
            "pages", rs.getInt("pages")
        ), id);
    }
}
