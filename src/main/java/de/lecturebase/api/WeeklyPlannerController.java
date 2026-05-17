package de.lecturebase.api;

import de.lecturebase.service.WeeklyPlannerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/planner-week")
public class WeeklyPlannerController {

    private final WeeklyPlannerService service;

    public WeeklyPlannerController(WeeklyPlannerService service) { this.service = service; }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(service.config());
    }

    @PutMapping("/config")
    public ResponseEntity<Void> saveConfig(@RequestBody Map<String, Object> body) {
        service.saveConfig(body);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/appointments")
    public List<Map<String, Object>> getAppointments() { return service.appointments(); }

    @PostMapping("/appointments")
    public ResponseEntity<Map<String, Object>> createAppointment(@RequestBody Map<String, Object> body) {
        String id = service.createAppointment(body);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @DeleteMapping("/appointments/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable String id) {
        service.deleteAppointment(id);
        return ResponseEntity.ok().build();
    }
}
