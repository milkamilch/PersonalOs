package de.lecturebase.api;

import de.lecturebase.service.FinanceScheduler;
import de.lecturebase.service.FinanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService service;
    private final FinanceScheduler scheduler;

    public FinanceController(FinanceService service, FinanceScheduler scheduler) {
        this.service = service;
        this.scheduler = scheduler;
    }

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

    @GetMapping("/monthly-totals")
    public List<Map<String, Object>> monthlyTotals(@RequestParam(defaultValue = "6") int months) {
        return service.monthlyTotals(months);
    }

    @GetMapping("/recurring")
    public List<Map<String, Object>> recurring() { return service.recurring(); }

    @PostMapping("/recurring")
    public Map<String, Object> createRecurring(@RequestBody Map<String, Object> body) {
        return service.createRecurring(body);
    }

    @DeleteMapping("/recurring/{id}")
    public ResponseEntity<Map<String, String>> deleteRecurring(@PathVariable long id) {
        service.deleteRecurring(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/recurring/{id}/toggle")
    public ResponseEntity<Map<String, String>> toggleRecurring(@PathVariable long id) {
        service.toggleRecurring(id);
        return ResponseEntity.ok(Map.of("status", "toggled"));
    }

    @PostMapping("/recurring/run-now")
    public ResponseEntity<Map<String, String>> runRecurringNow() {
        scheduler.bookRecurring();
        return ResponseEntity.ok(Map.of("status", "done"));
    }
}
