package de.lecturebase.api;

import de.lecturebase.ai.AiClient;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/journal")
public class JournalController {

    private final JdbcTemplate jdbc;
    private final AiClient ai;

    public JournalController(JdbcTemplate jdbc, AiClient ai) {
        this.jdbc = jdbc;
        this.ai = ai;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "30") int limit) {
        return jdbc.queryForList(
            "SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT ?", limit);
    }

    @GetMapping("/today")
    public Map<String, Object> today() {
        String today = LocalDate.now().toString();
        return jdbc.queryForList(
            "SELECT * FROM journal_entries WHERE entry_date = ?", today)
            .stream().findFirst()
            .orElse(Map.of("entry_date", today, "mood", 3, "content", "", "id", -1));
    }

    @PostMapping
    public Map<String, Object> upsert(@RequestBody Map<String, Object> body) {
        String date = (String) body.getOrDefault("entryDate", LocalDate.now().toString());
        int mood = ((Number) body.getOrDefault("mood", 3)).intValue();
        String content = (String) body.getOrDefault("content", "");

        jdbc.update("""
            INSERT INTO journal_entries (entry_date, mood, content)
            VALUES (?, ?, ?)
            ON CONFLICT(entry_date) DO UPDATE SET mood=excluded.mood, content=excluded.content
        """, date, mood, content);

        return jdbc.queryForMap("SELECT * FROM journal_entries WHERE entry_date = ?", date);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM journal_entries WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/mood-trend")
    public List<Map<String, Object>> moodTrend() {
        return jdbc.queryForList("""
            SELECT entry_date, mood FROM journal_entries
            ORDER BY entry_date DESC LIMIT 30
        """);
    }

    /** AI reflection on the last 7 journal entries. */
    @PostMapping("/reflect")
    public Map<String, String> reflect() {
        List<Map<String, Object>> entries = jdbc.queryForList("""
            SELECT entry_date, mood, content FROM journal_entries
            ORDER BY entry_date DESC LIMIT 7
        """);

        if (entries.isEmpty()) {
            return Map.of("reflection", "Noch keine Einträge vorhanden. Schreib ein paar Tage lang und ich kann deine Woche reflektieren.");
        }

        String[] moodLabels = {"", "Schlecht", "Mäßig", "Okay", "Gut", "Super"};
        String entriesText = entries.stream()
            .map(e -> {
                String date = String.valueOf(e.get("entry_date"));
                int mood    = ((Number) e.get("mood")).intValue();
                String text = String.valueOf(e.getOrDefault("content", "")).trim();
                return String.format("[%s] Stimmung: %s (%d/5)\n%s",
                    date, mood > 0 && mood <= 5 ? moodLabels[mood] : "?", mood,
                    text.isEmpty() ? "(kein Text)" : text);
            })
            .collect(Collectors.joining("\n\n---\n\n"));

        String system = """
            Du bist ein einfühlsamer persönlicher Assistent, der Journaleinträge reflektiert.
            Antworte auf Deutsch. Sei kurz, ehrlich und ermutigend.
            Vermeide Floskeln. Maximal 150 Wörter.
            Struktur: 1) Was diese Woche auffällt (Muster, Themen, Stimmung), 2) Eine konkrete Beobachtung, 3) Ein kurzer Gedankenanstoß.
            """;

        String userMsg = "Hier sind meine letzten Journaleinträge. Bitte reflektiere sie kurz:\n\n" + entriesText;

        try {
            String reflection = ai.ask(system, userMsg);
            return Map.of("reflection", reflection);
        } catch (Exception e) {
            return Map.of("reflection", "Reflexion konnte nicht generiert werden. Prüfe ob der AI-API-Key gesetzt ist.");
        }
    }
}
