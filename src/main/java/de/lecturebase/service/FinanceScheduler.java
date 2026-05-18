package de.lecturebase.service;

import de.lecturebase.repository.FinanceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Component
public class FinanceScheduler {

    private final FinanceRepository repo;

    public FinanceScheduler(FinanceRepository repo) { this.repo = repo; }

    /** Runs every day at 07:00 and books due recurring transactions. */
    @Scheduled(cron = "0 0 7 * * *")
    public void bookRecurring() {
        LocalDate today = LocalDate.now();
        String month = today.toString().substring(0, 7);
        int day = today.getDayOfMonth();
        int lastDay = today.lengthOfMonth();

        List<Map<String, Object>> entries = repo.findRecurring();
        for (Map<String, Object> r : entries) {
            Object activeVal = r.get("active");
            if (activeVal == null || ((Number) activeVal).intValue() != 1) continue;

            int dom = ((Number) r.get("day_of_month")).intValue();
            String lastBooked = (String) r.get("last_booked_month");

            // Book if: today matches day_of_month OR (day_of_month > lastDay and today is last day of month)
            boolean dueToday = dom == day || (dom > lastDay && day == lastDay);
            if (!dueToday) continue;
            if (month.equals(lastBooked)) continue;

            long id = ((Number) r.get("id")).longValue();
            Object catId = r.get("category_id");
            double amount = ((Number) r.get("amount")).doubleValue();
            String description = (String) r.get("name");
            String type = (String) r.get("type");

            repo.createTransaction(catId != null ? ((Number) catId).longValue() : null,
                amount, description, today.toString(), type);
            repo.markRecurringBooked(id, month);
        }
    }
}
