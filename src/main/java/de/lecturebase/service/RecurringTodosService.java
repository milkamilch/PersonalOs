package de.lecturebase.service;

import de.lecturebase.repository.RecurringTodosRepository;
import org.springframework.stereotype.Service;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class RecurringTodosService {

    private final RecurringTodosRepository repo;

    public RecurringTodosService(RecurringTodosRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list() {
        String today = LocalDate.now().toString();
        List<Map<String, Object>> items = repo.findAllActive();
        for (Map<String, Object> item : items) {
            long id = ((Number) item.get("id")).longValue();
            String rec = (String) item.get("recurrence");
            item.put("done_today", repo.countDoneToday(id, today) > 0);
            item.put("due_today",  isDueToday(rec));
            item.put("recurrence_label", rec != null && rec.startsWith("weekly:")
                ? "Wöchentlich · " + dayName(rec.substring(7))
                : "Täglich");
        }
        return items;
    }

    public Map<String, Object> create(Map<String, Object> body) {
        return repo.create(
            (String) body.getOrDefault("text", ""),
            (String) body.getOrDefault("recurrence", "daily"));
    }

    public void delete(long id) { repo.delete(id); }

    public Map<String, Object> toggle(long id) {
        String today = LocalDate.now().toString();
        int done = repo.countDoneToday(id, today);
        if (done > 0) repo.removeDone(id, today);
        else          repo.addDone(id, today);
        return Map.of("done", done == 0);
    }

    private boolean isDueToday(String recurrence) {
        if (recurrence == null || recurrence.equals("daily")) return true;
        if (recurrence.startsWith("weekly:")) {
            try {
                return LocalDate.now().getDayOfWeek() ==
                    DayOfWeek.valueOf(recurrence.substring(7).toUpperCase());
            } catch (IllegalArgumentException e) { return true; }
        }
        return true;
    }

    private String dayName(String day) {
        return switch (day.toUpperCase()) {
            case "MONDAY" -> "Mo"; case "TUESDAY" -> "Di"; case "WEDNESDAY" -> "Mi";
            case "THURSDAY" -> "Do"; case "FRIDAY" -> "Fr";
            case "SATURDAY" -> "Sa"; case "SUNDAY" -> "So";
            default -> day;
        };
    }
}
