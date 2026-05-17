package de.lecturebase.api;

import de.lecturebase.service.RecurringTodosService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recurring-todos")
public class RecurringTodoController {

    private final RecurringTodosService service;

    public RecurringTodoController(RecurringTodosService service) { this.service = service; }

    @GetMapping
    public List<Map<String, Object>> list() { return service.list(); }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) { return service.create(body); }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        service.delete(id);
        return Map.of("ok", true);
    }

    @PostMapping("/{id}/toggle")
    public Map<String, Object> toggle(@PathVariable long id) { return service.toggle(id); }
}
