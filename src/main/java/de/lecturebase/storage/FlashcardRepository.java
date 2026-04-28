package de.lecturebase.storage;

import de.lecturebase.model.Flashcard;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class FlashcardRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Flashcard> mapper = (rs, row) -> {
        Flashcard fc = new Flashcard();
        fc.setId(rs.getLong("id"));
        fc.setDocumentId(rs.getLong("document_id"));
        fc.setChunkId(rs.getLong("chunk_id"));
        fc.setQuestion(rs.getString("question"));
        fc.setAnswer(rs.getString("answer"));
        Object known = rs.getObject("known");
        if (known != null) fc.setKnown(((Number) known).intValue() == 1);
        fc.setEasiness(rs.getDouble("easiness"));
        fc.setRepetitions(rs.getInt("repetitions"));
        fc.setIntervalDays(rs.getInt("interval_days"));
        fc.setNextReview(rs.getString("next_review"));
        return fc;
    };

    public FlashcardRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(Flashcard fc) {
        jdbc.update(
            "INSERT INTO flashcards (document_id, chunk_id, question, answer) VALUES (?, ?, ?, ?)",
            fc.getDocumentId(), fc.getChunkId(), fc.getQuestion(), fc.getAnswer()
        );
    }

    public List<Flashcard> findByDocument(long documentId) {
        return jdbc.query(
            "SELECT * FROM flashcards WHERE document_id = ? ORDER BY id",
            mapper, documentId
        );
    }

    /** Karten die heute fällig sind (next_review <= heute ODER noch nie gelernt). */
    public List<Flashcard> findDueByDocument(long documentId) {
        String today = LocalDate.now().toString();
        return jdbc.query(
            "SELECT * FROM flashcards WHERE document_id = ? AND (next_review IS NULL OR next_review <= ?) ORDER BY next_review",
            mapper, documentId, today
        );
    }

    /** Anzahl fälliger Karten je Dokument. */
    public Map<Long, Integer> findDueCountsPerDocument() {
        String today = LocalDate.now().toString();
        Map<Long, Integer> result = new HashMap<>();
        jdbc.query("""
            SELECT document_id, COUNT(*) AS cnt
            FROM flashcards
            WHERE next_review IS NULL OR next_review <= ?
            GROUP BY document_id
            """, rs -> {
            result.put(rs.getLong("document_id"), rs.getInt("cnt"));
        }, today);
        return result;
    }

    public List<Flashcard> findAll() {
        return jdbc.query("SELECT * FROM flashcards ORDER BY document_id, id", mapper);
    }

    public void deleteByDocument(long documentId) {
        jdbc.update("DELETE FROM flashcards WHERE document_id = ?", documentId);
    }

    /**
     * SM-2 Algorithmus: known=true → Qualität 4, known=false → Qualität 1.
     * Berechnet nächsten Review-Termin und aktualisiert Easiness + Interval.
     */
    public Flashcard rate(long id, boolean known) {
        Flashcard fc = jdbc.query("SELECT * FROM flashcards WHERE id = ?", mapper, id)
                .stream().findFirst().orElse(null);
        if (fc == null) return null;

        int quality      = known ? 4 : 1;
        double easiness  = fc.getEasiness();
        int repetitions  = fc.getRepetitions();
        int interval;

        if (quality < 3) {
            repetitions = 0;
            interval    = 1;
        } else {
            interval = switch (repetitions) {
                case 0  -> 1;
                case 1  -> 6;
                default -> (int) Math.round(fc.getIntervalDays() * easiness);
            };
            repetitions++;
        }

        easiness = easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        if (easiness < 1.3) easiness = 1.3;

        String nextReview = LocalDate.now().plusDays(interval).toString();

        jdbc.update("""
            UPDATE flashcards
            SET known = ?, easiness = ?, repetitions = ?, interval_days = ?, next_review = ?, rated_at = DATE('now')
            WHERE id = ?
            """, known ? 1 : 0, easiness, repetitions, interval, nextReview, id);

        fc.setKnown(known);
        fc.setEasiness(easiness);
        fc.setRepetitions(repetitions);
        fc.setIntervalDays(interval);
        fc.setNextReview(nextReview);
        return fc;
    }

    public void resetRatings(long documentId) {
        jdbc.update("""
            UPDATE flashcards
            SET known = NULL, easiness = 2.5, repetitions = 0, interval_days = 0, next_review = NULL
            WHERE document_id = ?
            """, documentId);
    }
}
