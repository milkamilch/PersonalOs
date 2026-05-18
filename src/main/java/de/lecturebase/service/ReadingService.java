package de.lecturebase.service;

import de.lecturebase.repository.ReadingRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class ReadingService {

    private final ReadingRepository repo;

    public ReadingService(ReadingRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> sessions(Integer mediaId, int days) {
        if (mediaId != null) return repo.findByMedia(mediaId);
        return repo.findRecent(days);
    }

    public Map<String, Object> log(Map<String, Object> body) {
        Object mid = body.get("mediaId");
        if (mid == null) throw new IllegalArgumentException("mediaId is required");
        return repo.log(
            ((Number) mid).intValue(),
            ((Number) body.getOrDefault("pagesRead", 0)).intValue(),
            ((Number) body.getOrDefault("minutes", 0)).intValue(),
            (String) body.getOrDefault("sessionDate", LocalDate.now().toString()),
            (String) body.getOrDefault("note", ""));
    }

    public void delete(long id) { repo.delete(id); }

    public Map<String, Object> stats() {
        String today = LocalDate.now().toString();
        String week  = LocalDate.now().minusDays(6).toString();
        int streak = calcStreak();
        return Map.of(
            "todayMin",  repo.sumMinutesOnDate(today),
            "weekMin",   repo.sumMinutes(week),
            "weekPages", repo.sumPages(week),
            "streak",    streak);
    }

    private int calcStreak() {
        List<String> dates = repo.findDistinctDatesDesc();
        if (dates.isEmpty()) return 0;
        int streak = 0;
        LocalDate expected = LocalDate.now();
        for (String d : dates) {
            LocalDate date = LocalDate.parse(d);
            if (!date.equals(expected)) break;
            streak++;
            expected = expected.minusDays(1);
        }
        return streak;
    }
}
