package de.lecturebase.ingestion;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class IngestionService {

    private final DocumentParser parser;
    private final TextChunker chunker;
    private final ChunkRepository repository;

    public IngestionService(DocumentParser parser, TextChunker chunker, ChunkRepository repository) {
        this.parser = parser;
        this.chunker = chunker;
        this.repository = repository;
    }

    public IngestionResult ingest(File file) throws IOException {
        String name = file.getName().toLowerCase();

        List<DocumentParser.PageContent> pages;
        if (name.endsWith(".pdf")) {
            pages = parser.parsePdf(file);
        } else if (name.endsWith(".docx")) {
            pages = parser.parseDocx(file);
        } else {
            throw new IllegalArgumentException("Nicht unterstütztes Format: " + file.getName());
        }

        long documentId = repository.saveDocument(file.getName(), file.getAbsolutePath());

        List<Chunk> allChunks = new ArrayList<>();
        for (DocumentParser.PageContent page : pages) {
            allChunks.addAll(chunker.chunk(documentId, page.pageNumber(), page.text()));
        }
        repository.saveChunks(allChunks);

        return new IngestionResult(documentId, file.getName(), pages.size(), allChunks.size());
    }

    public record IngestionResult(long documentId, String name, int pages, int chunks) {}
}
