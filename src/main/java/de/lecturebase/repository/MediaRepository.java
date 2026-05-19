package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.*;

@Repository
public class MediaRepository {

    private final JdbcTemplate jdbc;

    public MediaRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findAll(String type, String status) {
        StringBuilder sql = new StringBuilder("SELECT * FROM media_items WHERE 1=1");
        List<Object> params = new ArrayList<>();
        if (type   != null) { sql.append(" AND type = ?");   params.add(type); }
        if (status != null) { sql.append(" AND status = ?"); params.add(status); }
        sql.append(" ORDER BY CASE status WHEN 'in_progress' THEN 0 WHEN 'want' THEN 1 ELSE 2 END, created_at DESC");
        return jdbc.queryForList(sql.toString(), params.toArray());
    }

    public Map<String, Object> create(String type, String title, String creator, String status, String notes, int totalPages) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO media_items (type, title, creator, status, notes, total_pages) VALUES (?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, type); ps.setString(2, title);
            ps.setString(3, creator); ps.setString(4, status); ps.setString(5, notes);
            ps.setInt(6, totalPages);
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?",
            Objects.requireNonNull(kh.getKey(), "Insert did not return a generated key").longValue());
    }

    public Map<String, Object> updateProgress(long id, int currentPage) {
        jdbc.update("UPDATE media_items SET current_page = ? WHERE id = ?", currentPage, id);
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?", id);
    }

    public Map<String, Object> addPages(long id, int pages) {
        jdbc.update("UPDATE media_items SET current_page = MIN(current_page + ?, CASE WHEN total_pages > 0 THEN total_pages ELSE current_page + ? END) WHERE id = ?",
            pages, pages, id);
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?", id);
    }

    public Map<String, Object> updateDetails(long id, String title, String creator, Integer totalPages) {
        if (title != null)      jdbc.update("UPDATE media_items SET title=? WHERE id=?", title, id);
        if (creator != null)    jdbc.update("UPDATE media_items SET creator=? WHERE id=?", creator, id);
        if (totalPages != null) jdbc.update("UPDATE media_items SET total_pages=? WHERE id=?", totalPages, id);
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?", id);
    }

    public Map<String, Object> updateStatus(long id, String status) {
        String finishedAt = "done".equals(status) ? LocalDate.now().toString() : null;
        jdbc.update("UPDATE media_items SET status=?, finished_at=? WHERE id=?", status, finishedAt, id);
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?", id);
    }

    public Map<String, Object> updateRating(long id, Integer rating) {
        if (rating == null) jdbc.update("UPDATE media_items SET rating=NULL WHERE id=?", id);
        else                jdbc.update("UPDATE media_items SET rating=? WHERE id=?", rating, id);
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?", id);
    }

    public Map<String, Object> updateNotes(long id, String notes) {
        jdbc.update("UPDATE media_items SET notes=? WHERE id=?", notes, id);
        return jdbc.queryForMap("SELECT * FROM media_items WHERE id = ?", id);
    }

    public void delete(long id) { jdbc.update("DELETE FROM media_items WHERE id = ?", id); }

    public int count(String type, String status) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM media_items WHERE type=? AND status=?",
            Integer.class, type, status)).orElse(0);
    }
}
