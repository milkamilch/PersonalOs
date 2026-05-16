package de.lecturebase.service;

import de.lecturebase.repository.HabitsRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
public class HabitsService {

    private final HabitsRepository repo;

    public HabitsService(HabitsRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list() {
        return repo.findAllWithTodayStatus(LocalDate.now().toString());
    }

    public Map<String, Object> create(String name, String icon, String color) {
        return repo.create(name, icon, color);
    }

    public void delete(long id) { repo.delete(id); }

    public Map<String, Object> toggle(long id) {
        String today = LocalDate.now().toString();
        int existing = repo.countEntryToday(id, today);
        if (existing > 0) repo.removeEntry(id, today);
        else              repo.addEntry(id, today);
        return Map.of("done", existing == 0);
    }

    public Map<String, Object> streak(long id) {
        List<String> dates = repo.findAllEntryDates(id);
        int streak = 0;
        LocalDate cursor = LocalDate.now();
        for (String d : dates) {
            if (LocalDate.parse(d).equals(cursor)) { streak++; cursor = cursor.minusDays(1); }
            else break;
        }
        return Map.of("streak", streak, "total", dates.size());
    }

    public List<Map<String, Object>> week() {
        LocalDate today = LocalDate.now();
        int total = repo.countHabits();
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            String date = today.minusDays(i).toString();
            result.add(Map.of("date", date, "done", repo.countEntriesOnDate(date), "total", total));
        }
        return result;
    }

    public List<Map<String, Object>> heatmap(int days) {
        LocalDate today = LocalDate.now();
        int total = repo.countHabits();
        Map<String, Integer> doneByDate = new HashMap<>();
        repo.findHeatmapEntries(days).forEach(r ->
            doneByDate.put((String) r.get("entry_date"), ((Number) r.get("done")).intValue()));
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            String date = today.minusDays(i).toString();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", date);
            row.put("done", doneByDate.getOrDefault(date, 0));
            row.put("total", total);
            result.add(row);
        }
        return result;
    }
}
