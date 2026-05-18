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
public class ContactsRepository {

    private final JdbcTemplate jdbc;

    public ContactsRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findAll() {
        return jdbc.queryForList("SELECT * FROM contacts ORDER BY name ASC");
    }

    public List<Map<String, Object>> search(String q) {
        String like = "%" + q.toLowerCase() + "%";
        return jdbc.queryForList("""
            SELECT * FROM contacts
            WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?
            ORDER BY name ASC
        """, like, like, like);
    }

    public Map<String, Object> create(Map<String, Object> body) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO contacts (name, email, phone, company, notes, tag, last_contact) VALUES (?,?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setObject(1, body.getOrDefault("name", ""));
            ps.setObject(2, body.getOrDefault("email", ""));
            ps.setObject(3, body.getOrDefault("phone", ""));
            ps.setObject(4, body.getOrDefault("company", ""));
            ps.setObject(5, body.getOrDefault("notes", ""));
            ps.setObject(6, body.getOrDefault("tag", ""));
            ps.setObject(7, body.get("lastContact"));
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM contacts WHERE id=?",
            Objects.requireNonNull(kh.getKey()).longValue());
    }

    public Map<String, Object> update(long id, Map<String, Object> body) {
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

    public void delete(long id) { jdbc.update("DELETE FROM contacts WHERE id=?", id); }
}
