package de.lecturebase.api;

import de.lecturebase.model.Project;
import de.lecturebase.service.ProjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService service;

    public ProjectController(ProjectService service) { this.service = service; }

    @GetMapping
    public List<Project> list() { return service.list(); }

    @PostMapping
    public ResponseEntity<Project> create(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "#7c3aed") String color) {
        return ResponseEntity.ok(service.create(name, description, color));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, String>> update(
            @PathVariable long id,
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "#7c3aed") String color) {
        service.update(id, name, description, color);
        return ResponseEntity.ok(Map.of("status", "updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/{id}/notes")
    public Map<String, String> notes(@PathVariable long id) {
        return Map.of("content", service.notes(id));
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<Map<String, String>> saveNotes(
            @PathVariable long id, @RequestBody String content) {
        service.saveNotes(id, content);
        return ResponseEntity.ok(Map.of("status", "saved"));
    }
}
