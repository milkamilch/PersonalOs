package de.lecturebase.api;

import de.lecturebase.service.HabitsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/habits")
public class HabitsController {

    private final HabitsService service;

    public HabitsController(HabitsService service) { this.service = service; }

    @GetMapping
    public List<Map<String, Object>> list() { return service.list(); }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, String> body) {
        return service.create(
            body.getOrDefault("name", "Habit"),
            body.getOrDefault("icon", "✓"),
            body.getOrDefault("color", "#7c3aed"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/{id}/toggle")
    public Map<String, Object> toggle(@PathVariable long id) { return service.toggle(id); }

    @GetMapping("/streak/{id}")
    public Map<String, Object> streak(@PathVariable long id) { return service.streak(id); }

    @GetMapping("/week")
    public List<Map<String, Object>> week() { return service.week(); }

    @GetMapping("/heatmap")
    public List<Map<String, Object>> heatmap(@RequestParam(defaultValue = "120") int days) {
        return service.heatmap(days);
    }
}
