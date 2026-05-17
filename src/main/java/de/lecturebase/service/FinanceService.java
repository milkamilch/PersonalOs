package de.lecturebase.service;

import de.lecturebase.repository.FinanceRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
public class FinanceService {

    private final FinanceRepository repo;

    public FinanceService(FinanceRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> categories() { return repo.findCategories(); }

    public Map<String, Object> createCategory(Map<String, Object> body) {
        return repo.createCategory(
            (String) body.getOrDefault("name", "Kategorie"),
            (String) body.getOrDefault("icon", "💳"),
            (String) body.getOrDefault("color", "#7c3aed"),
            ((Number) body.getOrDefault("budgetMonthly", 0)).doubleValue(),
            (String) body.getOrDefault("type", "expense"));
    }

    public void deleteCategory(long id) { repo.deleteCategory(id); }

    public List<Map<String, Object>> transactions(int limit, String month) {
        if (month != null) return repo.findTransactionsByMonth(month);
        return repo.findTransactions(limit);
    }

    public Map<String, Object> createTransaction(Map<String, Object> body) {
        Object catId = body.get("categoryId");
        return repo.createTransaction(
            catId != null ? ((Number) catId).longValue() : null,
            ((Number) body.getOrDefault("amount", 0)).doubleValue(),
            (String) body.getOrDefault("description", ""),
            (String) body.getOrDefault("txDate", LocalDate.now().toString()),
            (String) body.getOrDefault("type", "expense"));
    }

    public void deleteTransaction(long id) { repo.deleteTransaction(id); }

    public Map<String, Object> summary(String month) {
        if (month == null) month = LocalDate.now().toString().substring(0, 7);
        double income   = repo.sumByType("income",  month);
        double expenses = repo.sumByType("expense", month);
        double target   = Double.parseDouble(repo.getSetting("monthly_income"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("month",         month);
        result.put("income",        income);
        result.put("expenses",      expenses);
        result.put("balance",       income - expenses);
        result.put("monthlyIncome", target);
        result.put("byCategory",    repo.summarizeByCategory(month));
        return result;
    }

    public void saveSettings(Map<String, String> body) {
        body.forEach(repo::saveSetting);
    }

    public Map<String, String> getSettings() { return repo.getAllSettings(); }
}
