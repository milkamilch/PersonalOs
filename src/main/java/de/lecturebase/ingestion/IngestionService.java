package de.lecturebase.ingestion;

import de.lecturebase.ai.EmbeddingClient;
import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.EmbeddingRepository;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class IngestionService {

    private final DocumentParser      parser;
    private final TextChunker         chunker;
    private final ChunkRepository     repository;
    private final EmbeddingClient     embeddingClient;
    private final EmbeddingRepository embeddingRepository;

    public IngestionService(DocumentParser parser, TextChunker chunker,
                            ChunkRepository repository,
                            EmbeddingClient embeddingClient,
                            EmbeddingRepository embeddingRepository) {
        this.parser              = parser;
        this.chunker             = chunker;
        this.repository          = repository;
        this.embeddingClient     = embeddingClient;
        this.embeddingRepository = embeddingRepository;
    }

    public IngestionResult ingest(File file) throws IOException {
        return ingest(file, null);
    }

    public IngestionResult ingest(File file, String fileHash) throws IOException {
        String name = file.getName().toLowerCase();

        List<DocumentParser.PageContent> pages;
        if (name.endsWith(".pdf")) {
            pages = parser.parsePdf(file);
        } else if (name.endsWith(".docx")) {
            pages = parser.parseDocx(file);
        } else {
            throw new IllegalArgumentException("Nicht unterstütztes Format: " + file.getName());
        }

        long documentId = repository.saveDocument(file.getName(), file.getAbsolutePath(), fileHash);

        List<Chunk> allChunks = new ArrayList<>();
        for (DocumentParser.PageContent page : pages) {
            allChunks.addAll(chunker.chunk(documentId, page.pageNumber(), page.text()));
        }
        repository.saveChunks(allChunks);

        // Embeddings nur generieren wenn Voyage API Key konfiguriert ist
        if (embeddingClient.isEnabled()) {
            generateEmbeddings(allChunks);
        }

        return new IngestionResult(documentId, file.getName(), pages.size(), allChunks.size());
    }

    private void generateEmbeddings(List<Chunk> chunks) {
        List<String> texts = chunks.stream().map(Chunk::getText).toList();
        List<double[]> embeddings = embeddingClient.embedBatch(texts);
        for (int i = 0; i < chunks.size(); i++) {
            embeddingRepository.save(chunks.get(i).getId(), embeddings.get(i));
        }
    }

    public record IngestionResult(long documentId, String name, int pages, int chunks) {}
}
