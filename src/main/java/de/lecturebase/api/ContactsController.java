package de.lecturebase.api;

import de.lecturebase.service.ContactsService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contacts")
public class ContactsController {

    private final ContactsService service;

    public ContactsController(ContactsService service) { this.service = service; }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String q) {
        return service.list(q);
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        return service.create(body);
    }

    @PatchMapping("/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        service.delete(id);
        return Map.of("ok", true);
    }
}
