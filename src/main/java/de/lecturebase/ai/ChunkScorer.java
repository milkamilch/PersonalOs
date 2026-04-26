package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ChunkScorer {

    private static final int MIN_WORD_LENGTH = 3;

    /**
     * Bewertet jeden Chunk danach, wie viele Suchbegriffe er enthält.
     * Score = Anteil der Query-Terme, die im Chunk-Text vorkommen (0.0–1.0).
     */
    public List<ScoredChunk> score(String query, List<Chunk> candidates) {
        Set<String> queryTerms = tokenize(query);
        if (queryTerms.isEmpty()) {
            return candidates.stream().map(c -> new ScoredChunk(c, 0.0)).toList();
        }

        return candidates.stream()
                .map(chunk -> {
                    Set<String> chunkTerms = tokenize(chunk.getText());
                    long matches = queryTerms.stream().filter(chunkTerms::contains).count();
                    double score = (double) matches / queryTerms.size();
                    return new ScoredChunk(chunk, score);
                })
                .filter(sc -> sc.score() > 0)
                .sorted(Comparator.comparingDouble(ScoredChunk::score).reversed())
                .toList();
    }

    Set<String> tokenize(String text) {
        return Arrays.stream(text.toLowerCase().split("[\\s\\p{Punct}]+"))
                .filter(w -> w.length() >= MIN_WORD_LENGTH)
                .collect(Collectors.toSet());
    }

    public record ScoredChunk(Chunk chunk, double score) {}
}
