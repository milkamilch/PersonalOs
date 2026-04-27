package de.lecturebase.storage;

import de.lecturebase.model.Flashcard;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

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

    public List<Flashcard> findAll() {
        return jdbc.query("SELECT * FROM flashcards ORDER BY document_id, id", mapper);
    }

    public void deleteByDocument(long documentId) {
        jdbc.update("DELETE FROM flashcards WHERE document_id = ?", documentId);
    }

    public void rate(long id, boolean known) {
        jdbc.update("UPDATE flashcards SET known = ? WHERE id = ?", known ? 1 : 0, id);
    }

    public void resetRatings(long documentId) {
        jdbc.update("UPDATE flashcards SET known = NULL WHERE document_id = ?", documentId);
    }
}
