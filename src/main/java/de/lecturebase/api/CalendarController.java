package de.lecturebase.api;

import de.lecturebase.service.CalendarService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar")
public class CalendarController {

    private final CalendarService service;

    public CalendarController(CalendarService service) { this.service = service; }

    @GetMapping("/events")
    public List<Map<String, Object>> list(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return service.list(from, to);
    }

    @PostMapping("/events")
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        return service.create(body);
    }

    @PatchMapping("/events/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> body) {
        return service.update(id, body);
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }
}
