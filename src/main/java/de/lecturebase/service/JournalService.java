package de.lecturebase.service;

import de.lecturebase.repository.JournalRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class JournalService {

    private final JournalRepository repo;

    public JournalService(JournalRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list(int limit) { return repo.findAll(limit); }

    public Map<String, Object> today() { return repo.findByDate(LocalDate.now().toString()); }

    public Map<String, Object> upsert(Map<String, Object> body) {
        String date    = (String) body.getOrDefault("entryDate", LocalDate.now().toString());
        int    mood    = ((Number) body.getOrDefault("mood", 3)).intValue();
        String content = (String) body.getOrDefault("content", "");
        return repo.upsert(date, mood, content);
    }

    public void delete(long id) { repo.delete(id); }

    public List<Map<String, Object>> moodTrend() { return repo.moodTrend(); }
}
