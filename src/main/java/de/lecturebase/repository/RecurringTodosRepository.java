package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class RecurringTodosRepository {

    private final JdbcTemplate jdbc;

    public RecurringTodosRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findAllActive() {
        return jdbc.queryForList("SELECT * FROM recurring_todos WHERE active=1 ORDER BY id");
    }

    public Map<String, Object> create(String text, String recurrence) {
        jdbc.update("INSERT INTO recurring_todos (text, recurrence) VALUES (?,?)", text, recurrence);
        return jdbc.queryForMap("SELECT * FROM recurring_todos ORDER BY id DESC LIMIT 1");
    }

    public void delete(long id) { jdbc.update("DELETE FROM recurring_todos WHERE id=?", id); }

    public int countDoneToday(long id, String today) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT COUNT(*) FROM recurring_todo_done WHERE recurring_id=? AND done_date=?",
            Integer.class, id, today)).orElse(0);
    }

    public void addDone(long id, String today) {
        jdbc.update("INSERT OR IGNORE INTO recurring_todo_done (recurring_id, done_date) VALUES (?,?)", id, today);
    }

    public void removeDone(long id, String today) {
        jdbc.update("DELETE FROM recurring_todo_done WHERE recurring_id=? AND done_date=?", id, today);
    }
}
