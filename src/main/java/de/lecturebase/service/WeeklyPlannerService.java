package de.lecturebase.service;

import de.lecturebase.repository.WeeklyPlannerRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WeeklyPlannerService {

    private final WeeklyPlannerRepository repo;

    public WeeklyPlannerService(WeeklyPlannerRepository repo) { this.repo = repo; }

    public Map<String, Object> config() {
        List<Map<String, Object>> rows = repo.findConfig();
        return rows.isEmpty() ? Map.of() : rows.get(0);
    }

    public void saveConfig(Map<String, Object> body) { repo.saveConfig(body); }

    public List<Map<String, Object>> appointments() { return repo.findAppointments(); }

    public String createAppointment(Map<String, Object> body) {
        String id = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        repo.createAppointment(id,
            num(body, "day_index", 0),
            str(body, "title", "Termin"),
            num(body, "start_min", 600),
            num(body, "duration_min", 60),
            num(body, "travel_min", 0));
        return id;
    }

    public void deleteAppointment(String id) { repo.deleteAppointment(id); }

    private String str(Map<String, Object> m, String key, String def) {
        Object v = m.get(key); return v != null ? v.toString() : def;
    }

    private int num(Map<String, Object> m, String key, int def) {
        Object v = m.get(key);
        if (v == null) return def;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return def; }
    }
}
