package de.lecturebase.api;

import de.lecturebase.service.GoalsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/goals")
public class GoalsController {

    private final GoalsService service;

    public GoalsController(GoalsService service) { this.service = service; }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String horizon,
            @RequestParam(required = false) String status) {
        return service.list(horizon, status);
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        return service.create(body);
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/{id}/todos")
    public List<Map<String, Object>> todos(@PathVariable long id) { return service.todos(id); }

    @GetMapping("/{id}/time")
    public Map<String, Object> time(@PathVariable long id) { return service.time(id); }
}
