package de.lecturebase.api;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/contacts")
public class ContactsController {

    private final JdbcTemplate jdbc;

    public ContactsController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String q) {
        if (q != null && !q.isBlank()) {
            String like = "%" + q.toLowerCase() + "%";
            return jdbc.queryForList("""
                SELECT * FROM contacts
                WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?
                ORDER BY name ASC
            """, like, like, like);
        }
        return jdbc.queryForList("SELECT * FROM contacts ORDER BY name ASC");
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        jdbc.update("""
            INSERT INTO contacts (name, email, phone, company, notes, tag, last_contact)
            VALUES (?,?,?,?,?,?,?)
        """,
            body.getOrDefault("name", ""),
            body.getOrDefault("email", ""),
            body.getOrDefault("phone", ""),
            body.getOrDefault("company", ""),
            body.getOrDefault("notes", ""),
            body.getOrDefault("tag", ""),
            body.get("lastContact"));
        return jdbc.queryForMap("SELECT * FROM contacts ORDER BY id DESC LIMIT 1");
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> body) {
        body.forEach((key, val) -> {
            String col = switch (key) {
                case "name" -> "name"; case "email" -> "email"; case "phone" -> "phone";
                case "company" -> "company"; case "notes" -> "notes"; case "tag" -> "tag";
                case "lastContact" -> "last_contact";
                default -> null;
            };
            if (col != null) jdbc.update("UPDATE contacts SET " + col + "=? WHERE id=?", val, id);
        });
        return jdbc.queryForMap("SELECT * FROM contacts WHERE id=?", id);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        jdbc.update("DELETE FROM contacts WHERE id=?", id);
        return Map.of("ok", true);
    }
}
