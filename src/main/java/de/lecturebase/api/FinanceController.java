package de.lecturebase.api;

import de.lecturebase.service.FinanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService service;

    public FinanceController(FinanceService service) { this.service = service; }

    @GetMapping("/categories")
    public List<Map<String, Object>> categories() { return service.categories(); }

    @PostMapping("/categories")
    public Map<String, Object> createCategory(@RequestBody Map<String, Object> body) {
        return service.createCategory(body);
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable long id) {
        service.deleteCategory(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/transactions")
    public List<Map<String, Object>> transactions(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String month) {
        return service.transactions(limit, month);
    }

    @PostMapping("/transactions")
    public Map<String, Object> createTransaction(@RequestBody Map<String, Object> body) {
        return service.createTransaction(body);
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Map<String, String>> deleteTransaction(@PathVariable long id) {
        service.deleteTransaction(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(@RequestParam(required = false) String month) {
        return service.summary(month);
    }

    @PostMapping("/settings")
    public ResponseEntity<Map<String, String>> saveSettings(@RequestBody Map<String, String> body) {
        service.saveSettings(body);
        return ResponseEntity.ok(Map.of("status", "saved"));
    }

    @GetMapping("/settings")
    public Map<String, String> getSettings() { return service.getSettings(); }
}
