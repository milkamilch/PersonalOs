package de.lecturebase.api;

import de.lecturebase.model.Todo;
import de.lecturebase.service.TodoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoService service;

    public TodoController(TodoService service) { this.service = service; }

    @GetMapping
    public List<Todo> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long goalId) {
        return service.list(projectId, goalId);
    }

    @PostMapping
    public Todo create(
            @RequestParam String text,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long goalId) {
        return service.create(text, projectId, goalId);
    }

    @PostMapping("/{id}/done")
    public ResponseEntity<Map<String, String>> setDone(
            @PathVariable long id, @RequestParam boolean done) {
        service.setDone(id, done);
        return ResponseEntity.ok(Map.of("status", done ? "done" : "open"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
