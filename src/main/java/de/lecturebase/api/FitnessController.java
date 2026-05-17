package de.lecturebase.api;

import de.lecturebase.service.FitnessService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fitness")
public class FitnessController {

    private final FitnessService service;

    public FitnessController(FitnessService service) { this.service = service; }

    @GetMapping("/workouts")
    public List<Map<String, Object>> workouts(@RequestParam(defaultValue = "30") int limit) {
        return service.workouts(limit);
    }

    @PostMapping("/workouts")
    public Map<String, Object> createWorkout(@RequestBody Map<String, Object> body) {
        return service.createWorkout(body);
    }

    @PostMapping("/workouts/{id}/exercises")
    public Map<String, Object> addExercise(@PathVariable long id, @RequestBody Map<String, Object> body) {
        return service.addExercise(id, body);
    }

    @DeleteMapping("/workouts/{id}")
    public ResponseEntity<Map<String, String>> deleteWorkout(@PathVariable long id) {
        service.deleteWorkout(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() { return service.stats(); }

    @GetMapping("/weight")
    public List<Map<String, Object>> weightLog(@RequestParam(defaultValue = "90") int days) {
        return service.weightLog(days);
    }

    @PostMapping("/weight")
    public Map<String, Object> logWeight(@RequestBody Map<String, Object> body) {
        return service.logWeight(body);
    }

    @DeleteMapping("/weight/{id}")
    public Map<String, Object> deleteWeight(@PathVariable long id) {
        service.deleteWeight(id);
        return Map.of("ok", true);
    }
}
