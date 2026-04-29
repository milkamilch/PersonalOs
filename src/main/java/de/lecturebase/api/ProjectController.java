package de.lecturebase.api;

import de.lecturebase.model.Document;
import de.lecturebase.model.Project;
import de.lecturebase.storage.ProjectRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;

    public ProjectController(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @GetMapping
    public List<Project> list() {
        return projectRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Project> create(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "#7c3aed") String color) {
        long id = projectRepository.create(name, description, color);
        return projectRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.internalServerError().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, String>> update(
            @PathVariable long id,
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "#7c3aed") String color) {
        projectRepository.update(id, name, description, color);
        return ResponseEntity.ok(Map.of("status", "updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        projectRepository.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/{id}/documents")
    public List<Document> documents(@PathVariable long id) {
        return projectRepository.findDocuments(id);
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<Map<String, String>> addDocument(
            @PathVariable long id,
            @RequestParam long documentId) {
        projectRepository.addDocument(id, documentId);
        return ResponseEntity.ok(Map.of("status", "added"));
    }

    @DeleteMapping("/{id}/documents/{documentId}")
    public ResponseEntity<Map<String, String>> removeDocument(
            @PathVariable long id,
            @PathVariable long documentId) {
        projectRepository.removeDocument(id, documentId);
        return ResponseEntity.ok(Map.of("status", "removed"));
    }

    @GetMapping("/{id}/notes")
    public Map<String, String> notes(@PathVariable long id) {
        return Map.of("content", projectRepository.findNotes(id));
    }

    @PostMapping("/{id}/notes")
    public ResponseEntity<Map<String, String>> saveNotes(
            @PathVariable long id,
            @RequestBody String content) {
        projectRepository.saveNotes(id, content);
        return ResponseEntity.ok(Map.of("status", "saved"));
    }
}
