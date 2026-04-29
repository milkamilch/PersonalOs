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
    public List<Todo> list(@RequestParam(required = false) Long projectId) {
        return projectId != null
                ? todoRepository.findByProject(projectId)
                : todoRepository.findAll();
    }

    @PostMapping
    public Todo create(
            @RequestParam(required = false) Long projectId,
            @RequestParam String text) {
        return todoRepository.create(projectId, text);
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
