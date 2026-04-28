package de.lecturebase.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final JdbcTemplate jdbc;

    public StatsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public Map<String, Object> stats() {
        String today = LocalDate.now().toString();

        int todayCount = count("SELECT COUNT(*) FROM flashcards WHERE rated_at = ?", today);
        int totalDocs  = count("SELECT COUNT(*) FROM documents");
        int totalCards = count("SELECT COUNT(*) FROM flashcards");
        int docsWithoutCards = count("""
            SELECT COUNT(*) FROM documents d
            WHERE NOT EXISTS (SELECT 1 FROM flashcards f WHERE f.document_id = d.id)
            """);
        int docsWithoutMindmap = count("""
            SELECT COUNT(*) FROM documents d
            WHERE NOT EXISTS (SELECT 1 FROM mindmap_status ms WHERE ms.document_id = d.id)
            """);

        List<String> ratedDates = jdbc.queryForList(
            "SELECT DISTINCT rated_at FROM flashcards WHERE rated_at IS NOT NULL ORDER BY rated_at DESC",
            String.class);
        int streak = computeStreak(ratedDates);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("todayCount",        todayCount);
        result.put("streak",            streak);
        result.put("totalDocs",         totalDocs);
        result.put("totalCards",        totalCards);
        result.put("docsWithoutCards",  docsWithoutCards);
        result.put("docsWithoutMindmap",docsWithoutMindmap);
        return result;
    }

    private int count(String sql, Object... args) {
        Integer n = jdbc.queryForObject(sql, Integer.class, args);
        return n != null ? n : 0;
    }

    private int computeStreak(List<String> sortedDatesDesc) {
        if (sortedDatesDesc.isEmpty()) return 0;
        LocalDate expected = LocalDate.now();
        int streak = 0;
        for (String ds : sortedDatesDesc) {
            LocalDate d = LocalDate.parse(ds);
            if (d.equals(expected)) { streak++; expected = expected.minusDays(1); }
            else break;
        }
        return streak;
    }
}
