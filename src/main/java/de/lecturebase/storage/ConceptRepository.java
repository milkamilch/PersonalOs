package de.lecturebase.storage;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    public boolean hasBuilt(long documentId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM mindmap_status WHERE document_id = ?", Integer.class, documentId);
        return count != null && count > 0;
    }

    public void markBuilt(long documentId) {
        jdbc.update("""
            INSERT INTO mindmap_status (document_id) VALUES (?)
            ON CONFLICT(document_id) DO UPDATE SET built_at = CURRENT_TIMESTAMP
            """, documentId);
    }

    public long countConceptsForDocument(long documentId) {
        // concepts are global – return total as proxy for "already has data"
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM concepts", Long.class);
        return count != null ? count : 0;
    }

    public void linkToDocument(long conceptId, long documentId) {
        jdbc.update(
            "INSERT OR IGNORE INTO concept_documents (concept_id, document_id) VALUES (?, ?)",
            conceptId, documentId
        );
    }

    public void clearDocumentLinks(long documentId) {
        jdbc.update("DELETE FROM concept_documents WHERE document_id = ?", documentId);
    }

    public Map<Long, List<String>> findDocumentNamesForAllConcepts() {
        Map<Long, List<String>> result = new java.util.HashMap<>();
        jdbc.query("""
            SELECT cd.concept_id, d.name
            FROM concept_documents cd
            JOIN documents d ON d.id = cd.document_id
            """, rs -> {
            long conceptId = rs.getLong("concept_id");
            result.computeIfAbsent(conceptId, k -> new java.util.ArrayList<>())
                  .add(rs.getString("name"));
        });
        return result;
    }

    public Set<Long> findProcessedChunkIds() {
        return new HashSet<>(
            jdbc.queryForList("SELECT chunk_id FROM concept_chunk_done", Long.class));
    }

    public void markChunkProcessed(long chunkId) {
        jdbc.update("INSERT OR IGNORE INTO concept_chunk_done (chunk_id) VALUES (?)", chunkId);
    }

    public void clearProcessedChunksForDocument(long documentId) {
        jdbc.update("""
            DELETE FROM concept_chunk_done
            WHERE chunk_id IN (SELECT id FROM chunks WHERE document_id = ?)
            """, documentId);
    }

    public void clearAllProcessedChunks() {
        jdbc.update("DELETE FROM concept_chunk_done");
    }

    public void deleteAll() {
        jdbc.update("DELETE FROM concept_documents");
        jdbc.update("DELETE FROM concept_chunk_done");
        jdbc.update("DELETE FROM concept_links");
        jdbc.update("DELETE FROM concepts");
        jdbc.update("DELETE FROM mindmap_status");
    }

    public record ConceptNode(long id, String name) {}
    public record ConceptLink(long conceptAId, long conceptBId,
                              String nameA, String nameB, double weight) {}
}
