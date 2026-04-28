package de.lecturebase.storage;

import de.lecturebase.model.Document;
import de.lecturebase.model.Project;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class ProjectRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Project> mapper = (rs, row) -> {
        Project p = new Project();
        p.setId(rs.getLong("id"));
        p.setName(rs.getString("name"));
        p.setDescription(rs.getString("description"));
        p.setColor(rs.getString("color"));
        p.setCreatedAt(rs.getString("created_at"));
        return p;
    };

    public ProjectRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Project> findAll() {
        List<Project> projects = jdbc.query(
            "SELECT * FROM projects ORDER BY created_at DESC", mapper);
        projects.forEach(p -> {
            Integer docs = jdbc.queryForObject(
                "SELECT COUNT(*) FROM project_documents WHERE project_id = ?", Integer.class, p.getId());
            Integer todos = jdbc.queryForObject(
                "SELECT COUNT(*) FROM todos WHERE project_id = ?", Integer.class, p.getId());
            Integer open = jdbc.queryForObject(
                "SELECT COUNT(*) FROM todos WHERE project_id = ? AND done = 0", Integer.class, p.getId());
            p.setDocCount(docs != null ? docs : 0);
            p.setTodoCount(todos != null ? todos : 0);
            p.setOpenTodoCount(open != null ? open : 0);
        });
        return projects;
    }

    public Optional<Project> findById(long id) {
        List<Project> result = jdbc.query("SELECT * FROM projects WHERE id = ?", mapper, id);
        return result.isEmpty() ? Optional.empty() : Optional.of(result.get(0));
    }

    public long create(String name, String description, String color) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO projects (name, description, color) VALUES (?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name);
            ps.setString(2, description != null ? description : "");
            ps.setString(3, color != null ? color : "#7c3aed");
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void update(long id, String name, String description, String color) {
        jdbc.update("UPDATE projects SET name = ?, description = ?, color = ? WHERE id = ?",
            name, description != null ? description : "", color != null ? color : "#7c3aed", id);
    }

    public void delete(long id) {
        jdbc.update("DELETE FROM project_documents WHERE project_id = ?", id);
        jdbc.update("DELETE FROM project_notes WHERE project_id = ?", id);
        jdbc.update("DELETE FROM todos WHERE project_id = ?", id);
        jdbc.update("DELETE FROM projects WHERE id = ?", id);
    }

    public void addDocument(long projectId, long documentId) {
        jdbc.update(
            "INSERT OR IGNORE INTO project_documents (project_id, document_id) VALUES (?, ?)",
            projectId, documentId);
    }

    public void removeDocument(long projectId, long documentId) {
        jdbc.update(
            "DELETE FROM project_documents WHERE project_id = ? AND document_id = ?",
            projectId, documentId);
    }

    public List<Document> findDocuments(long projectId) {
        return jdbc.query("""
            SELECT d.id, d.name, d.file_path, d.uploaded_at
            FROM documents d
            JOIN project_documents pd ON pd.document_id = d.id
            WHERE pd.project_id = ?
            ORDER BY d.uploaded_at DESC
            """, (rs, row) -> {
            Document d = new Document();
            d.setId(rs.getLong("id"));
            d.setName(rs.getString("name"));
            d.setFilePath(rs.getString("file_path"));
            return d;
        }, projectId);
    }

    public String findNotes(long projectId) {
        List<String> result = jdbc.queryForList(
            "SELECT content FROM project_notes WHERE project_id = ?", String.class, projectId);
        return result.isEmpty() ? "" : result.get(0);
    }

    public void saveNotes(long projectId, String content) {
        jdbc.update("""
            INSERT INTO project_notes (project_id, content) VALUES (?, ?)
            ON CONFLICT(project_id) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP
            """, projectId, content != null ? content : "");
    }
}
