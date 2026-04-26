package de.lecturebase.storage;

import de.lecturebase.model.Chunk;
import de.lecturebase.model.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest
@Import({ChunkRepository.class, DatabaseConfig.class})
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:sqlite::memory:",
        "spring.datasource.driver-class-name=org.sqlite.JDBC",
        "spring.datasource.hikari.maximum-pool-size=1"
})
class ChunkRepositoryTest {

    @Autowired
    ChunkRepository repository;

    @Test
    void saveDocumentGibtIdZurueck() {
        long id = repository.saveDocument("skript.pdf", "/tmp/skript.pdf");
        assertThat(id).isPositive();
    }

    @Test
    void saveDocumentMehrereHabenVerschiedeneIds() {
        long id1 = repository.saveDocument("a.pdf", "/tmp/a.pdf");
        long id2 = repository.saveDocument("b.pdf", "/tmp/b.pdf");
        assertThat(id1).isNotEqualTo(id2);
    }

    @Test
    void saveChunksUndFindByDocument() {
        long docId = repository.saveDocument("vorlesung.pdf", "/tmp/vorlesung.pdf");

        Chunk c1 = chunk(docId, 1, 0, "Einführung in Algorithmen");
        Chunk c2 = chunk(docId, 1, 1, "Sortieralgorithmen im Überblick");
        repository.saveChunks(List.of(c1, c2));

        List<Chunk> result = repository.findChunksByDocument(docId);
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getText()).isEqualTo("Einführung in Algorithmen");
        assertThat(result.get(1).getText()).isEqualTo("Sortieralgorithmen im Überblick");
    }

    @Test
    void findChunksByDocumentIgnoriertAnderesDokument() {
        long doc1 = repository.saveDocument("a.pdf", "/tmp/a.pdf");
        long doc2 = repository.saveDocument("b.pdf", "/tmp/b.pdf");
        repository.saveChunks(List.of(chunk(doc1, 1, 0, "Inhalt A")));
        repository.saveChunks(List.of(chunk(doc2, 1, 0, "Inhalt B")));

        List<Chunk> result = repository.findChunksByDocument(doc1);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getText()).isEqualTo("Inhalt A");
    }

    @Test
    void findAllChunksGibtAlleZurueck() {
        long doc1 = repository.saveDocument("x.pdf", "/tmp/x.pdf");
        long doc2 = repository.saveDocument("y.pdf", "/tmp/y.pdf");
        repository.saveChunks(List.of(chunk(doc1, 1, 0, "X Text")));
        repository.saveChunks(List.of(chunk(doc2, 1, 0, "Y Text")));

        List<Chunk> all = repository.findAllChunks();
        assertThat(all).hasSize(2);
    }

    @Test
    void findAllDocumentsGibtAlleZurueck() {
        repository.saveDocument("alpha.pdf", "/tmp/alpha.pdf");
        repository.saveDocument("beta.pdf", "/tmp/beta.pdf");

        List<Document> docs = repository.findAllDocuments();
        assertThat(docs).hasSizeGreaterThanOrEqualTo(2);
        assertThat(docs).extracting(Document::getName)
                .contains("alpha.pdf", "beta.pdf");
    }

    @Test
    void chunksHabenRichtigenPageNumberUndIndex() {
        long docId = repository.saveDocument("test.pdf", "/tmp/test.pdf");
        repository.saveChunks(List.of(chunk(docId, 3, 2, "Seite drei")));

        Chunk saved = repository.findChunksByDocument(docId).get(0);
        assertThat(saved.getPageNumber()).isEqualTo(3);
        assertThat(saved.getChunkIndex()).isEqualTo(2);
        assertThat(saved.getDocumentId()).isEqualTo(docId);
    }

    private Chunk chunk(long docId, int page, int index, String text) {
        Chunk c = new Chunk();
        c.setDocumentId(docId);
        c.setPageNumber(page);
        c.setChunkIndex(index);
        c.setText(text);
        return c;
    }
}
