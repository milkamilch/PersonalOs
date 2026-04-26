package de.lecturebase.storage;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest
@Import({TagRepository.class, ChunkRepository.class, DatabaseConfig.class})
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:sqlite::memory:",
        "spring.datasource.driver-class-name=org.sqlite.JDBC",
        "spring.datasource.hikari.maximum-pool-size=1"
})
class TagRepositoryTest {

    @Autowired TagRepository    tagRepository;
    @Autowired ChunkRepository  chunkRepository;

    @Test
    void getOrCreateLegtNeuenTagAn() {
        long id = tagRepository.getOrCreate("Algorithmen");
        assertThat(id).isPositive();
    }

    @Test
    void getOrCreateGibtSelbeIdBeiDoppeltemAufruf() {
        long id1 = tagRepository.getOrCreate("Mathe");
        long id2 = tagRepository.getOrCreate("Mathe");
        assertThat(id1).isEqualTo(id2);
    }

    @Test
    void assignToDocumentVerknuepftTagMitDokument() {
        long docId = chunkRepository.saveDocument("algo.pdf", "/tmp/algo.pdf");
        long tagId = tagRepository.getOrCreate("Informatik");
        tagRepository.assignToDocument(docId, tagId);

        List<de.lecturebase.model.Document> docs = chunkRepository.findByTag("Informatik");
        assertThat(docs).hasSize(1);
        assertThat(docs.get(0).getTags()).contains("Informatik");
    }

    @Test
    void removeFromDocumentEntferntZuordnung() {
        long docId = chunkRepository.saveDocument("buch.pdf", "/tmp/buch.pdf");
        long tagId = tagRepository.getOrCreate("Physik");
        tagRepository.assignToDocument(docId, tagId);
        tagRepository.removeFromDocument(docId, "Physik");

        List<de.lecturebase.model.Document> docs = chunkRepository.findByTag("Physik");
        assertThat(docs).isEmpty();
    }

    @Test
    void findAllGibtAlleTagsAlphabetischZurueck() {
        tagRepository.getOrCreate("Zustandsautomat");
        tagRepository.getOrCreate("Algorithmen");
        tagRepository.getOrCreate("Mathe");

        List<String> tags = tagRepository.findAll();
        assertThat(tags).contains("Algorithmen", "Mathe", "Zustandsautomat");
        assertThat(tags).isSortedAccordingTo(String::compareTo);
    }

    @Test
    void findByTagIgnoriertDokumenteMitAnderemTag() {
        long doc1 = chunkRepository.saveDocument("a.pdf", "/tmp/a.pdf");
        long doc2 = chunkRepository.saveDocument("b.pdf", "/tmp/b.pdf");
        tagRepository.assignToDocument(doc1, tagRepository.getOrCreate("Mathe"));
        tagRepository.assignToDocument(doc2, tagRepository.getOrCreate("Informatik"));

        List<de.lecturebase.model.Document> result = chunkRepository.findByTag("Mathe");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("a.pdf");
    }

    @Test
    void dokumentOhneTagHatLeereTagListe() {
        chunkRepository.saveDocument("kein-tag.pdf", "/tmp/kein-tag.pdf");
        List<de.lecturebase.model.Document> docs = chunkRepository.findAllDocuments();
        assertThat(docs).anyMatch(d -> d.getTags().isEmpty());
    }
}
