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

    public Map<String, Object> create(Map<String, String> body) {
        return repo.create(
            body.getOrDefault("title", ""),
            body.getOrDefault("event_date", ""),
            body.get("start_time"),
            body.get("end_time"),
            body.getOrDefault("notes", ""),
            body.getOrDefault("color", "#0a84ff"));
    }

    public Map<String, Object> update(long id, Map<String, String> body) {
        Map<String, Object> cur = repo.findById(id);
        return repo.update(id,
            body.getOrDefault("title",      (String) cur.get("title")),
            body.getOrDefault("event_date", (String) cur.get("event_date")),
            body.getOrDefault("start_time", (String) cur.get("start_time")),
            body.getOrDefault("end_time",   (String) cur.get("end_time")),
            body.getOrDefault("notes",      (String) cur.getOrDefault("notes", "")),
            body.getOrDefault("color",      (String) cur.getOrDefault("color", "#0a84ff")));
    }

    public void delete(long id) { repo.delete(id); }
}
