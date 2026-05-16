package de.lecturebase.service;

import de.lecturebase.repository.GoalsRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class GoalsService {

    private final GoalsRepository repo;

    public GoalsService(GoalsRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list(String horizon, String status) {
        return repo.findAll(horizon, status);
    }

    public Map<String, Object> create(Map<String, Object> body) {
        return repo.create(
            (String) body.getOrDefault("title", "Ziel"),
            (String) body.getOrDefault("description", ""),
            (String) body.getOrDefault("horizon", "month"),
            (String) body.get("targetDate"));
    }

    public Map<String, Object> update(long id, Map<String, Object> body) {
        return repo.update(id, body);
    }

    public void delete(long id) { repo.delete(id); }

    public List<Map<String, Object>> todos(long id) { return repo.findTodos(id); }

    public Map<String, Object> time(long id) {
        return Map.of("total_s", repo.totalTimeSeconds(id));
    }
}
