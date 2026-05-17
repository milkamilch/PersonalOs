package de.lecturebase.api;

import de.lecturebase.service.TimeTrackingService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/time")
public class TimeTrackingController {

    private final TimeTrackingService service;

    public TimeTrackingController(TimeTrackingService service) { this.service = service; }

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) String project) {
        return service.list(days, project);
    }

    @GetMapping("/running")
    public Map<String, Object> running() { return service.running(); }

    @PostMapping("/start")
    public Map<String, Object> start(@RequestBody Map<String, Object> body) { return service.start(body); }

    @PostMapping("/stop")
    public Map<String, Object> stop() { return service.stop(); }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        service.delete(id);
        return Map.of("ok", true);
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() { return service.summary(); }
}
