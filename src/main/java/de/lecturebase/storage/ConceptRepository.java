package de.lecturebase.storage;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Repository
public class ConceptRepository {

    private final JdbcTemplate jdbc;

    public ConceptRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Liefert die ID des Konzepts – legt es an falls noch nicht vorhanden. */
    public long getOrCreate(String name) {
        jdbc.update("INSERT OR IGNORE INTO concepts (name) VALUES (?)", name);
        return jdbc.queryForObject("SELECT id FROM concepts WHERE name = ?", Long.class, name);
    }

    /**
     * Erstellt oder erhöht das Gewicht des Links zwischen zwei Konzepten.
     * Kleinere ID kommt immer zuerst, damit (A,B) und (B,A) als ein Link gelten.
     */
    public void addLink(long conceptA, long conceptB) {
        long a = Math.min(conceptA, conceptB);
        long b = Math.max(conceptA, conceptB);
        jdbc.update("""
                INSERT INTO concept_links (concept_a, concept_b, weight) VALUES (?, ?, 1.0)
                ON CONFLICT(concept_a, concept_b) DO UPDATE SET weight = weight + 1.0
                """, a, b);
    }

    public List<ConceptNode> findAllNodes() {
        return jdbc.query(
                "SELECT id, name FROM concepts ORDER BY name",
                (rs, row) -> new ConceptNode(rs.getLong("id"), rs.getString("name"))
        );
    }

    public List<ConceptLink> findAllLinks() {
        return jdbc.query("""
                SELECT cl.concept_a, cl.concept_b,
                       ca.name AS name_a, cb.name AS name_b,
                       cl.weight
                FROM concept_links cl
                JOIN concepts ca ON ca.id = cl.concept_a
                JOIN concepts cb ON cb.id = cl.concept_b
                ORDER BY cl.weight DESC
                """,
                (rs, row) -> new ConceptLink(
                        rs.getLong("concept_a"),
                        rs.getLong("concept_b"),
                        rs.getString("name_a"),
                        rs.getString("name_b"),
                        rs.getDouble("weight")
                )
        );
    }

    public void deleteAll() {
        jdbc.update("DELETE FROM concept_links");
        jdbc.update("DELETE FROM concepts");
    }

    public record ConceptNode(long id, String name) {}
    public record ConceptLink(long conceptAId, long conceptBId,
                              String nameA, String nameB, double weight) {}
}
