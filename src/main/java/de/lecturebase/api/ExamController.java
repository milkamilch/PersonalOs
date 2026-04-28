package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/exam-dates")
public class ExamController {

    private final JdbcTemplate jdbc;

    public ExamController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbc.query("""
            SELECT e.document_id, e.exam_date, d.name
            FROM exam_dates e
            JOIN documents d ON d.id = e.document_id
            ORDER BY e.exam_date
            """, (rs, row) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("documentId", rs.getLong("document_id"));
            m.put("examDate",   rs.getString("exam_date"));
            m.put("docName",    rs.getString("name"));
            m.put("daysLeft",   daysUntil(rs.getString("exam_date")));
            return m;
        });
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> set(
            @RequestParam long documentId,
            @RequestParam String date) {
        jdbc.update("""
            INSERT INTO exam_dates (document_id, exam_date) VALUES (?, ?)
            ON CONFLICT(document_id) DO UPDATE SET exam_date = excluded.exam_date
            """, documentId, date);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("documentId", documentId);
        r.put("examDate",   date);
        r.put("daysLeft",   daysUntil(date));
        return ResponseEntity.ok(r);
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long documentId) {
        jdbc.update("DELETE FROM exam_dates WHERE document_id = ?", documentId);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    private long daysUntil(String isoDate) {
        return ChronoUnit.DAYS.between(LocalDate.now(), LocalDate.parse(isoDate));
    }
}
