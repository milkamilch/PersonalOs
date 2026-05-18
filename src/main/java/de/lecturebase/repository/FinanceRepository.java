package de.lecturebase.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.*;

@Repository
public class FinanceRepository {

    private final JdbcTemplate jdbc;

    public FinanceRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findCategories() {
        return jdbc.queryForList("SELECT * FROM finance_categories ORDER BY type DESC, name");
    }

    public Map<String, Object> createCategory(String name, String icon, String color,
                                               double budget, String type) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO finance_categories (name, icon, color, budget_monthly, type) VALUES (?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name); ps.setString(2, icon); ps.setString(3, color);
            ps.setDouble(4, budget); ps.setString(5, type);
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM finance_categories WHERE id = ?",
            Objects.requireNonNull(kh.getKey(), "Insert did not return a generated key").longValue());
    }

    public void deleteCategory(long id) { jdbc.update("DELETE FROM finance_categories WHERE id = ?", id); }

    public List<Map<String, Object>> findTransactions(int limit) {
        return jdbc.queryForList("""
            SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM finance_transactions t LEFT JOIN finance_categories c ON c.id = t.category_id
            ORDER BY t.tx_date DESC, t.id DESC LIMIT ?
        """, limit);
    }

    public List<Map<String, Object>> findTransactionsByMonth(String month) {
        return jdbc.queryForList("""
            SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM finance_transactions t LEFT JOIN finance_categories c ON c.id = t.category_id
            WHERE strftime('%Y-%m', t.tx_date) = ? ORDER BY t.tx_date DESC, t.id DESC
        """, month);
    }

    public Map<String, Object> createTransaction(Long categoryId, double amount,
                                                  String description, String txDate, String type) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO finance_transactions (category_id, amount, description, tx_date, type) VALUES (?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            if (categoryId != null) ps.setLong(1, categoryId);
            else ps.setNull(1, java.sql.Types.INTEGER);
            ps.setDouble(2, amount); ps.setString(3, description);
            ps.setString(4, txDate); ps.setString(5, type);
            return ps;
        }, kh);
        return jdbc.queryForMap("""
            SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM finance_transactions t LEFT JOIN finance_categories c ON c.id = t.category_id
            WHERE t.id = ?
        """, Objects.requireNonNull(kh.getKey(), "Insert did not return a generated key").longValue());
    }

    public void deleteTransaction(long id) { jdbc.update("DELETE FROM finance_transactions WHERE id = ?", id); }

    public double sumByType(String type, String month) {
        return Optional.ofNullable(jdbc.queryForObject(
            "SELECT SUM(amount) FROM finance_transactions WHERE type=? AND strftime('%Y-%m', tx_date)=?",
            Double.class, type, month)).orElse(0.0);
    }

    public List<Map<String, Object>> summarizeByCategory(String month) {
        return jdbc.queryForList("""
            SELECT c.id, c.name, c.icon, c.color, c.budget_monthly,
                   COALESCE(SUM(t.amount), 0) as spent
            FROM finance_categories c
            LEFT JOIN finance_transactions t
                ON t.category_id = c.id AND t.type = 'expense'
                AND strftime('%Y-%m', t.tx_date) = ?
            WHERE c.type = 'expense' GROUP BY c.id ORDER BY spent DESC
        """, month);
    }

    public String getSetting(String key) {
        return jdbc.queryForList("SELECT value FROM finance_settings WHERE key=?", key)
            .stream().findFirst().map(r -> (String) r.get("value")).orElse("0");
    }

    public void saveSetting(String key, String value) {
        jdbc.update("INSERT INTO finance_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            key, value);
    }

    public Map<String, String> getAllSettings() {
        Map<String, String> result = new HashMap<>();
        jdbc.queryForList("SELECT key, value FROM finance_settings")
            .forEach(r -> result.put((String) r.get("key"), (String) r.get("value")));
        return result;
    }

    public List<Map<String, Object>> findRecurring() {
        return jdbc.queryForList("""
            SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM finance_recurring r LEFT JOIN finance_categories c ON c.id = r.category_id
            ORDER BY r.type DESC, r.day_of_month, r.id
        """);
    }

    public Map<String, Object> createRecurring(String name, double amount, String type,
                                                Long categoryId, int dayOfMonth) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO finance_recurring (name, amount, type, category_id, day_of_month) VALUES (?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name); ps.setDouble(2, amount); ps.setString(3, type);
            if (categoryId != null) ps.setLong(4, categoryId);
            else ps.setNull(4, java.sql.Types.INTEGER);
            ps.setInt(5, dayOfMonth);
            return ps;
        }, kh);
        return jdbc.queryForMap("""
            SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM finance_recurring r LEFT JOIN finance_categories c ON c.id = r.category_id
            WHERE r.id = ?
        """, Objects.requireNonNull(kh.getKey()).longValue());
    }

    public void deleteRecurring(long id) { jdbc.update("DELETE FROM finance_recurring WHERE id = ?", id); }

    public void toggleRecurring(long id) {
        jdbc.update("UPDATE finance_recurring SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id = ?", id);
    }
}
