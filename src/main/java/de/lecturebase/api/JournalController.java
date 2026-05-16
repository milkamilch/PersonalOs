package de.lecturebase.api;

import de.lecturebase.service.JournalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/journal")
public class JournalController {

    private final JournalService service;

    public JournalController(JournalService service) { this.service = service; }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "30") int limit) {
        return service.list(limit);
    }

    @GetMapping("/today")
    public Map<String, Object> today() { return service.today(); }

    @PostMapping
    public Map<String, Object> upsert(@RequestBody Map<String, Object> body) {
        return service.upsert(body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/mood-trend")
    public List<Map<String, Object>> moodTrend() { return service.moodTrend(); }
}
