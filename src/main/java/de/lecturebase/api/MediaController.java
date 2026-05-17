package de.lecturebase.api;

import de.lecturebase.service.MediaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/media")
public class MediaController {

    private final MediaService service;

    public MediaController(MediaService service) { this.service = service; }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        return service.list(type, status);
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) { return service.create(body); }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() { return service.stats(); }
}
