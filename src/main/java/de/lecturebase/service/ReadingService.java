package de.lecturebase.service;

import de.lecturebase.repository.MediaRepository;
import de.lecturebase.repository.ReadingRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class ReadingService {

    private final ReadingRepository repo;
    private final MediaRepository mediaRepo;

    public ReadingService(ReadingRepository repo, MediaRepository mediaRepo) {
        this.repo = repo;
        this.mediaRepo = mediaRepo;
    }

    public List<Map<String, Object>> sessions(Integer mediaId, int days) {
        if (mediaId != null) return repo.findByMedia(mediaId);
        return repo.findRecent(days);
    }

    public Map<String, Object> log(Map<String, Object> body) {
        Object mid = body.get("mediaId");
        if (mid == null) throw new IllegalArgumentException("mediaId is required");
        int mediaId  = ((Number) mid).intValue();
        int pages    = ((Number) body.getOrDefault("pagesRead", 0)).intValue();
        int minutes  = ((Number) body.getOrDefault("minutes", 0)).intValue();
        Map<String, Object> session = repo.log(
            mediaId, pages, minutes,
            (String) body.getOrDefault("sessionDate", LocalDate.now().toString()),
            (String) body.getOrDefault("note", ""));
        // Auto-advance current_page by pages read
        if (pages > 0) mediaRepo.addPages(mediaId, pages);
        return session;
    }

    public void delete(long id) { repo.delete(id); }

    public Map<String, Object> stats() {
        String today     = LocalDate.now().toString();
        String weekStart = LocalDate.now().minusDays(6).toString();
        String yearStart = LocalDate.now().getYear() + "-01-01";
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("todayMin",  repo.sumMinutesOnDate(today));
        result.put("weekMin",   repo.sumMinutes(weekStart));
        result.put("weekPages", repo.sumPages(weekStart));
        result.put("yearPages", repo.sumPages(yearStart));
        result.put("streak",    calcStreak());
        return result;
    }

    private int calcStreak() {
        List<String> dates = repo.findDistinctDatesDesc();
        if (dates.isEmpty()) return 0;
        int streak = 0;
        // Allow streak to continue if today not yet logged (start from yesterday)
        LocalDate expected = LocalDate.now();
        if (!dates.get(0).equals(expected.toString())) {
            expected = expected.minusDays(1);
        }
        for (String d : dates) {
            LocalDate date = LocalDate.parse(d);
            if (!date.equals(expected)) break;
            streak++;
            expected = expected.minusDays(1);
        }
        return streak;
    }
}
