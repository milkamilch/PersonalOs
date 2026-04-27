package de.lecturebase.ingestion;

import de.lecturebase.ai.EmbeddingClient;
import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.EmbeddingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IngestionServiceTest {

    @Mock DocumentParser       parser;
    @Mock TextChunker          chunker;
    @Mock ChunkRepository      repository;
    @Mock EmbeddingClient      embeddingClient;
    @Mock EmbeddingRepository  embeddingRepository;

    @InjectMocks IngestionService service;

    @TempDir Path tempDir;

    @Test
    void ingestPdfDelegiertAnParser() throws IOException {
        File pdf = createFile("skript.pdf");
        var page = new DocumentParser.PageContent(1, "Informatik Grundlagen");
        when(parser.parsePdf(pdf)).thenReturn(List.of(page));
        when(repository.saveDocument(anyString(), anyString())).thenReturn(1L);
        when(chunker.chunk(anyLong(), any(int.class), anyString())).thenReturn(List.of(new Chunk()));

        IngestionService.IngestionResult result = service.ingest(pdf);

        assertThat(result.documentId()).isEqualTo(1L);
        assertThat(result.name()).isEqualTo("skript.pdf");
        assertThat(result.pages()).isEqualTo(1);
        assertThat(result.chunks()).isEqualTo(1);
    }

    @Test
    void ingestDocxDelegiertAnParser() throws IOException {
        File docx = createFile("vorlesung.docx");
        var page = new DocumentParser.PageContent(1, "Datenstrukturen");
        when(parser.parseDocx(docx)).thenReturn(List.of(page));
        when(repository.saveDocument(anyString(), anyString())).thenReturn(2L);
        when(chunker.chunk(anyLong(), any(int.class), anyString())).thenReturn(List.of(new Chunk()));

        IngestionService.IngestionResult result = service.ingest(docx);

        assertThat(result.documentId()).isEqualTo(2L);
    }

    @Test
    void ingestSpeichertAlleChunks() throws IOException {
        File pdf = createFile("skript.pdf");
        var page = new DocumentParser.PageContent(1, "Text");
        Chunk c1 = new Chunk();
        Chunk c2 = new Chunk();
        when(parser.parsePdf(pdf)).thenReturn(List.of(page));
        when(repository.saveDocument(anyString(), anyString())).thenReturn(1L);
        when(chunker.chunk(anyLong(), any(int.class), anyString())).thenReturn(List.of(c1, c2));

        IngestionService.IngestionResult result = service.ingest(pdf);

        assertThat(result.chunks()).isEqualTo(2);
        verify(repository).saveChunks(List.of(c1, c2));
    }

    @Test
    void ingestUnsupportedFormatWirftException() throws IOException {
        File txt = createFile("notizen.txt");
        assertThatThrownBy(() -> service.ingest(txt))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("notizen.txt");
    }

    @Test
    void ingestMehrereSeitenSammeltAlleChunks() throws IOException {
        File pdf = createFile("lang.pdf");
        var p1 = new DocumentParser.PageContent(1, "Seite eins");
        var p2 = new DocumentParser.PageContent(2, "Seite zwei");
        when(parser.parsePdf(pdf)).thenReturn(List.of(p1, p2));
        when(repository.saveDocument(anyString(), anyString())).thenReturn(1L);
        when(chunker.chunk(anyLong(), any(int.class), anyString())).thenReturn(List.of(new Chunk()));

        IngestionService.IngestionResult result = service.ingest(pdf);

        assertThat(result.pages()).isEqualTo(2);
        assertThat(result.chunks()).isEqualTo(2); // je 1 Chunk pro Seite
    }

    private File createFile(String name) throws IOException {
        File f = tempDir.resolve(name).toFile();
        f.createNewFile();
        return f;
    }
}
