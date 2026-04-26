package de.lecturebase.ingestion;

import de.lecturebase.model.Chunk;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class TextChunker {

    private static final int CHUNK_SIZE = 500;  // Wörter pro Chunk
    private static final int OVERLAP    = 50;   // Wörter Überlappung zwischen Chunks

    public List<Chunk> chunk(Long documentId, int pageNumber, String text) {
        String[] words = text.split("\\s+");
        List<Chunk> chunks = new ArrayList<>();
        int chunkIndex = 0;

        for (int start = 0; start < words.length; start += CHUNK_SIZE - OVERLAP) {
            int end = Math.min(start + CHUNK_SIZE, words.length);
            String chunkText = String.join(" ", Arrays.copyOfRange(words, start, end));

            if (!chunkText.isBlank()) {
                Chunk chunk = new Chunk();
                chunk.setDocumentId(documentId);
                chunk.setPageNumber(pageNumber);
                chunk.setChunkIndex(chunkIndex++);
                chunk.setText(chunkText);
                chunks.add(chunk);
            }

            if (end == words.length) break;
        }

        return chunks;
    }
}
