package de.lecturebase.service;

import de.lecturebase.repository.TimeTrackingRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TimeTrackingService {

    private final TimeTrackingRepository repo;

    public TimeTrackingService(TimeTrackingRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list(int days, String project) {
        if (project != null && !project.isBlank()) return repo.findRecentByProject(days, project);
        return repo.findRecent(days);
    }

    public Map<String, Object> running() {
        List<Map<String, Object>> r = repo.findRunning();
        if (r.isEmpty()) return Map.of("running", false);
        Map<String, Object> entry = new HashMap<>(r.get(0));
        entry.put("running", true);
        return entry;
    }

    public Map<String, Object> start(Map<String, Object> body) {
        repo.stopRunning();
        Object gid = body.get("goal_id");
        Long goalId = gid != null ? ((Number) gid).longValue() : null;
        repo.start(
            (String) body.getOrDefault("project", ""),
            (String) body.getOrDefault("description", ""),
            goalId);
        return repo.findLatest();
    }

    public Map<String, Object> stop() {
        repo.stopRunning();
        List<Map<String, Object>> r = repo.findLatestStopped();
        return r.isEmpty() ? Map.of("ok", true) : r.get(0);
    }

    public void delete(long id) { repo.delete(id); }

    public Map<String, Object> summary() {
        String today = LocalDate.now().toString();
        String week  = LocalDate.now().minusDays(6).toString();
        String month = LocalDate.now().withDayOfMonth(1).toString();
        return Map.of(
            "todayS",    repo.sumSecondsOnDate(today),
            "weekS",     repo.sumSeconds(week),
            "monthS",    repo.sumSeconds(month),
            "byProject", repo.sumByProject(week));
    }
}
