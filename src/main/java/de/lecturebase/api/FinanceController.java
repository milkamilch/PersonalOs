package de.lecturebase.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final JdbcTemplate jdbc;

    public FinanceController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // ── Categories ──────────────────────────────────────────────────────────

    @GetMapping("/categories")
    public List<Map<String, Object>> categories() {
        return jdbc.queryForList(
            "SELECT * FROM finance_categories ORDER BY type DESC, name");
    }

    @PostMapping("/categories")
    public Map<String, Object> createCategory(@RequestBody Map<String, Object> body) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO finance_categories (name, icon, color, budget_monthly, type) VALUES (?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, (String) body.getOrDefault("name", "Kategorie"));
            ps.setString(2, (String) body.getOrDefault("icon", "💳"));
            ps.setString(3, (String) body.getOrDefault("color", "#7c3aed"));
            ps.setDouble(4, ((Number) body.getOrDefault("budgetMonthly", 0)).doubleValue());
            ps.setString(5, (String) body.getOrDefault("type", "expense"));
            return ps;
        }, kh);
        return jdbc.queryForMap("SELECT * FROM finance_categories WHERE id = ?", kh.getKey().longValue());
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable long id) {
        jdbc.update("DELETE FROM finance_categories WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    // ── Transactions ────────────────────────────────────────────────────────

    @GetMapping("/transactions")
    public List<Map<String, Object>> transactions(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String month) {
        if (month != null) {
            return jdbc.queryForList("""
                SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
                FROM finance_transactions t
                LEFT JOIN finance_categories c ON c.id = t.category_id
                WHERE strftime('%Y-%m', t.tx_date) = ?
                ORDER BY t.tx_date DESC, t.id DESC
            """, month);
        }
        return jdbc.queryForList("""
            SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM finance_transactions t
            LEFT JOIN finance_categories c ON c.id = t.category_id
            ORDER BY t.tx_date DESC, t.id DESC LIMIT ?
        """, limit);
    }

    @PostMapping("/transactions")
    public Map<String, Object> createTransaction(@RequestBody Map<String, Object> body) {
        var kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO finance_transactions (category_id, amount, description, tx_date, type) VALUES (?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS);
            Object catId = body.get("categoryId");
            if (catId != null) ps.setLong(1, ((Number) catId).longValue());
            else ps.setNull(1, java.sql.Types.INTEGER);
            ps.setDouble(2, ((Number) body.getOrDefault("amount", 0)).doubleValue());
            ps.setString(3, (String) body.getOrDefault("description", ""));
            ps.setString(4, (String) body.getOrDefault("txDate", LocalDate.now().toString()));
            ps.setString(5, (String) body.getOrDefault("type", "expense"));
            return ps;
        }, kh);
        return jdbc.queryForMap("""
            SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM finance_transactions t
            LEFT JOIN finance_categories c ON c.id = t.category_id
            WHERE t.id = ?
        """, kh.getKey().longValue());
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Map<String, String>> deleteTransaction(@PathVariable long id) {
        jdbc.update("DELETE FROM finance_transactions WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    // ── Summary ─────────────────────────────────────────────────────────────

    @GetMapping("/summary")
    public Map<String, Object> summary(@RequestParam(required = false) String month) {
        if (month == null) month = LocalDate.now().toString().substring(0, 7);

        double income = Optional.ofNullable(jdbc.queryForObject(
            "SELECT SUM(amount) FROM finance_transactions WHERE type='income' AND strftime('%Y-%m', tx_date)=?",
            Double.class, month)).orElse(0.0);
        double expenses = Optional.ofNullable(jdbc.queryForObject(
            "SELECT SUM(amount) FROM finance_transactions WHERE type='expense' AND strftime('%Y-%m', tx_date)=?",
            Double.class, month)).orElse(0.0);

        List<Map<String, Object>> byCategory = jdbc.queryForList("""
            SELECT c.id, c.name, c.icon, c.color, c.budget_monthly,
                   COALESCE(SUM(t.amount), 0) as spent
            FROM finance_categories c
            LEFT JOIN finance_transactions t
                ON t.category_id = c.id AND t.type = 'expense'
                AND strftime('%Y-%m', t.tx_date) = ?
            WHERE c.type = 'expense'
            GROUP BY c.id ORDER BY spent DESC
        """, month);

        // Setting: monthly income target
        String incomeTarget = jdbc.queryForList(
            "SELECT value FROM finance_settings WHERE key='monthly_income'")
            .stream().findFirst().map(r -> (String) r.get("value")).orElse("0");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("month", month);
        result.put("income", income);
        result.put("expenses", expenses);
        result.put("balance", income - expenses);
        result.put("monthlyIncome", Double.parseDouble(incomeTarget));
        result.put("byCategory", byCategory);
        return result;
    }

    // ── Settings ─────────────────────────────────────────────────────────────

    @PostMapping("/settings")
    public ResponseEntity<Map<String, String>> saveSetting(@RequestBody Map<String, String> body) {
        body.forEach((k, v) -> jdbc.update(
            "INSERT INTO finance_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            k, v));
        return ResponseEntity.ok(Map.of("status", "saved"));
    }

    @GetMapping("/settings")
    public Map<String, String> getSettings() {
        Map<String, String> result = new HashMap<>();
        jdbc.queryForList("SELECT key, value FROM finance_settings")
            .forEach(r -> result.put((String) r.get("key"), (String) r.get("value")));
        return result;
    }
}
