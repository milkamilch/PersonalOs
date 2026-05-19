package de.lecturebase.service;

import de.lecturebase.repository.CalendarRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class CalendarService {

    private final CalendarRepository repo;

    public CalendarService(CalendarRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list(String from, String to) {
        if (from != null && to != null) return repo.findBetween(from, to);
        return repo.findAll();
    }

    public Map<String, Object> create(Map<String, Object> body) {
        return repo.create(
            str(body, "title", ""),
            str(body, "event_date", ""),
            (String) body.get("start_time"),
            (String) body.get("end_time"),
            str(body, "notes", ""),
            str(body, "color", "#0a84ff"));
    }

    public Map<String, Object> update(long id, Map<String, Object> body) {
        Map<String, Object> cur = repo.findById(id);
        return repo.update(id,
            str(body, "title",      (String) cur.get("title")),
            str(body, "event_date", (String) cur.get("event_date")),
            body.containsKey("start_time") ? (String) body.get("start_time") : (String) cur.get("start_time"),
            body.containsKey("end_time")   ? (String) body.get("end_time")   : (String) cur.get("end_time"),
            str(body, "notes",  (String) cur.getOrDefault("notes", "")),
            str(body, "color",  (String) cur.getOrDefault("color", "#0a84ff")));
    }

    private String str(Map<String, Object> body, String key, String def) {
        return body.containsKey(key) && body.get(key) != null ? body.get(key).toString() : def;
    }

    public void delete(long id) { repo.delete(id); }
}
