package de.lecturebase.storage;

import de.lecturebase.model.Todo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Repository
public class TodoRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Todo> mapper = (rs, row) -> {
        Todo t = new Todo();
        t.setId(rs.getLong("id"));
        Object pid = rs.getObject("project_id");
        if (pid != null) t.setProjectId(((Number) pid).longValue());
        Object gid = rs.getObject("goal_id");
        if (gid != null) t.setGoalId(((Number) gid).longValue());
        t.setText(rs.getString("text"));
        t.setDone(rs.getInt("done") == 1);
        t.setCreatedAt(rs.getString("created_at"));
        return t;
    };

    public TodoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Todo> findAll() {
        return jdbc.query("SELECT * FROM todos ORDER BY done ASC, created_at DESC", mapper);
    }

    public List<Todo> findByProject(long projectId) {
        return jdbc.query(
            "SELECT * FROM todos WHERE project_id = ? ORDER BY done ASC, created_at DESC",
            mapper, projectId);
    }

    public List<Todo> findByGoal(long goalId) {
        return jdbc.query(
            "SELECT * FROM todos WHERE goal_id = ? ORDER BY done ASC, created_at DESC",
            mapper, goalId);
    }

    public Todo create(Long projectId, Long goalId, String text) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO todos (project_id, goal_id, text) VALUES (?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            if (projectId != null) ps.setLong(1, projectId); else ps.setNull(1, java.sql.Types.INTEGER);
            if (goalId    != null) ps.setLong(2, goalId);    else ps.setNull(2, java.sql.Types.INTEGER);
            ps.setString(3, text);
            return ps;
        }, keyHolder);
        long id = keyHolder.getKey().longValue();
        return jdbc.query("SELECT * FROM todos WHERE id = ?", mapper, id)
                .stream().findFirst().orElseThrow();
    }

    public void setDone(long id, boolean done) {
        jdbc.update("UPDATE todos SET done = ? WHERE id = ?", done ? 1 : 0, id);
    }

    public void delete(long id) {
        jdbc.update("DELETE FROM todos WHERE id = ?", id);
    }
}
