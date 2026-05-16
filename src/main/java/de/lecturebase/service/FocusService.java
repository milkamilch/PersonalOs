package de.lecturebase.service;

import de.lecturebase.repository.FocusRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.Map;

@Service
public class FocusService {

    private final FocusRepository repo;

    public FocusService(FocusRepository repo) { this.repo = repo; }

    public Map<String, Object> saveSession(int durationS) {
        String date = LocalDate.now().toString();
        repo.saveSession(durationS, date);
        return stats();
    }

    public Map<String, Object> stats() {
        String today     = LocalDate.now().toString();
        String weekStart = LocalDate.now().minusDays(6).toString();
        return Map.of(
            "today_count",   repo.countSessions(today),
            "today_seconds", repo.sumSecondsOnDate(today),
            "week_count",    repo.countSessionsSince(weekStart),
            "week_seconds",  repo.sumSeconds(weekStart)
        );
    }
}
