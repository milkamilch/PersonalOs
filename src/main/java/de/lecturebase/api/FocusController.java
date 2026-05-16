package de.lecturebase.api;

import de.lecturebase.service.FocusService;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/focus")
public class FocusController {

    private final FocusService service;

    public FocusController(FocusService service) { this.service = service; }

    @PostMapping("/session")
    public Map<String, Object> saveSession(@RequestBody Map<String, Object> body) {
        int durationS = body.containsKey("duration_s")
            ? ((Number) body.get("duration_s")).intValue() : 1500;
        return service.saveSession(durationS);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() { return service.stats(); }
}
