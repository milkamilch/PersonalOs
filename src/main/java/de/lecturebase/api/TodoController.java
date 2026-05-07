package de.lecturebase.api;

import de.lecturebase.model.Todo;
import de.lecturebase.storage.TodoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoRepository todoRepository;

    public TodoController(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    @GetMapping
    public List<Todo> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long goalId) {
        if (projectId != null) return todoRepository.findByProject(projectId);
        if (goalId    != null) return todoRepository.findByGoal(goalId);
        return todoRepository.findAll();
    }

    @PostMapping
    public Todo create(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long goalId,
            @RequestParam String text) {
        return todoRepository.create(projectId, goalId, text);
    }

    @PostMapping("/{id}/done")
    public ResponseEntity<Map<String, String>> setDone(
            @PathVariable long id,
            @RequestParam boolean done) {
        todoRepository.setDone(id, done);
        return ResponseEntity.ok(Map.of("status", done ? "done" : "open"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        todoRepository.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
