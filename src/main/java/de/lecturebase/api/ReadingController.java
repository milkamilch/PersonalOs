package de.lecturebase.api;

import de.lecturebase.service.ReadingService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reading")
public class ReadingController {

    private final ReadingService service;

    public ReadingController(ReadingService service) { this.service = service; }

    @GetMapping("/sessions")
    public List<Map<String, Object>> sessions(
            @RequestParam(required = false) Integer mediaId,
            @RequestParam(defaultValue = "30") int days) {
        return service.sessions(mediaId, days);
    }

    @PostMapping("/sessions")
    public Map<String, Object> log(@RequestBody Map<String, Object> body) { return service.log(body); }

    @DeleteMapping("/sessions/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        service.delete(id);
        return Map.of("ok", true);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() { return service.stats(); }
}
