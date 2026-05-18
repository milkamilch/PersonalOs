package de.lecturebase.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final JdbcTemplate jdbc;

    public SearchController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public List<Map<String, Object>> search(@RequestParam String q) {
        if (q == null || q.isBlank() || q.length() < 2) return List.of();
        String like = "%" + q.toLowerCase() + "%";
        List<Map<String, Object>> results = new ArrayList<>();

        // Todos
        jdbc.queryForList("""
            SELECT t.id, t.text, t.done, p.name as project_name
            FROM todos t LEFT JOIN projects p ON p.id = t.project_id
            WHERE LOWER(t.text) LIKE ? LIMIT 5
        """, like).forEach(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", "todo");
            item.put("id", r.get("id"));
            item.put("title", r.get("text"));
            item.put("sub", r.get("project_name") != null ? "Projekt: " + r.get("project_name") : "Kein Projekt");
            item.put("route", "/projects");
            item.put("icon", "✓");
            results.add(item);
        });

        // Finance transactions
        jdbc.queryForList("""
            SELECT t.id, t.description, t.amount, t.type, t.tx_date, c.name as cat
            FROM finance_transactions t LEFT JOIN finance_categories c ON c.id = t.category_id
            WHERE LOWER(t.description) LIKE ? ORDER BY t.tx_date DESC LIMIT 5
        """, like).forEach(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            double amt = ((Number) r.get("amount")).doubleValue();
            String type = (String) r.get("type");
            item.put("type", "transaction");
            item.put("id", r.get("id"));
            item.put("title", r.get("description"));
            item.put("sub", String.format("%s%,.2f € · %s", "expense".equals(type) ? "−" : "+", amt, r.get("tx_date")));
            item.put("route", "/finance");
            item.put("icon", "income".equals(type) ? "💰" : "💸");
            results.add(item);
        });

        // Quick notes
        jdbc.queryForList("""
            SELECT id, title, content FROM notes
            WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? LIMIT 4
        """, like, like).forEach(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            String content = (String) r.get("content");
            String preview = content != null && content.length() > 60 ? content.substring(0, 60) + "…" : content;
            item.put("type", "note");
            item.put("id", r.get("id"));
            item.put("title", r.get("title") != null && !((String)r.get("title")).isBlank() ? r.get("title") : "Notiz");
            item.put("sub", preview);
            item.put("route", "/notes");
            item.put("icon", "📝");
            results.add(item);
        });

        // Contacts
        jdbc.queryForList("""
            SELECT id, name, email, company FROM contacts
            WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ? LIMIT 4
        """, like, like, like).forEach(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", "contact");
            item.put("id", r.get("id"));
            item.put("title", r.get("name"));
            item.put("sub", r.get("company") != null && !((String)r.get("company")).isBlank()
                ? r.get("company") + (r.get("email") != null ? " · " + r.get("email") : "")
                : (r.get("email") != null ? (String) r.get("email") : ""));
            item.put("route", "/contacts");
            item.put("icon", "👤");
            results.add(item);
        });

        // Calendar events
        jdbc.queryForList("""
            SELECT id, title, event_date, notes FROM calendar_events
            WHERE LOWER(title) LIKE ? OR LOWER(notes) LIKE ? ORDER BY event_date DESC LIMIT 4
        """, like, like).forEach(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", "event");
            item.put("id", r.get("id"));
            item.put("title", r.get("title"));
            item.put("sub", "Termin: " + r.get("event_date"));
            item.put("route", "/calendar");
            item.put("icon", "📅");
            results.add(item);
        });

        // Projects
        jdbc.queryForList("""
            SELECT id, name, description FROM projects
            WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? LIMIT 3
        """, like, like).forEach(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", "project");
            item.put("id", r.get("id"));
            item.put("title", r.get("name"));
            item.put("sub", r.get("description") != null ? (String) r.get("description") : "Projekt");
            item.put("route", "/projects");
            item.put("icon", "📁");
            results.add(item);
        });

        return results;
    }
}
