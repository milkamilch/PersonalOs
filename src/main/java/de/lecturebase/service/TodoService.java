package de.lecturebase.service;

import de.lecturebase.model.Todo;
import de.lecturebase.storage.TodoRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TodoService {

    private final TodoRepository repo;

    public TodoService(TodoRepository repo) { this.repo = repo; }

    public List<Todo> list(Long projectId, Long goalId) {
        if (projectId != null) return repo.findByProject(projectId);
        if (goalId    != null) return repo.findByGoal(goalId);
        return repo.findAll();
    }

    public Todo create(String text, Long projectId, Long goalId) {
        return repo.create(projectId, goalId, text);
    }

    public void setDone(long id, boolean done) { repo.setDone(id, done); }

    public void delete(long id) { repo.delete(id); }
}
