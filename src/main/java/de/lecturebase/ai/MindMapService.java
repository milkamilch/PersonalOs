package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.ConceptRepository;
import org.jgrapht.graph.DefaultWeightedEdge;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MindMapService {

    private final ChunkRepository     chunkRepository;
    private final ConceptRepository   conceptRepository;
    private final ConceptExtractor    conceptExtractor;
    private final GraphBuilder        graphBuilder;

    public MindMapService(ChunkRepository chunkRepository,
                          ConceptRepository conceptRepository,
                          ConceptExtractor conceptExtractor,
                          GraphBuilder graphBuilder) {
        this.chunkRepository   = chunkRepository;
        this.conceptRepository = conceptRepository;
        this.conceptExtractor  = conceptExtractor;
        this.graphBuilder      = graphBuilder;
    }

    /**
     * Verarbeitet alle Chunks eines Dokuments:
     * Extrahiert Konzepte via Claude, speichert Knoten + Co-occurrence-Kanten.
     * Bestehende Konzepte werden nicht gelöscht – neue Aufrufe akkumulieren Gewichte.
     */
    public BuildResult build(Long documentId) {
        List<Chunk> chunks = documentId != null
                ? chunkRepository.findChunksByDocument(documentId)
                : chunkRepository.findAllChunks();

        int processedChunks = 0;
        int extractedConcepts = 0;

        for (Chunk chunk : chunks) {
            List<String> concepts = conceptExtractor.extract(chunk.getText());
            if (concepts.isEmpty()) continue;

            List<Long> ids = concepts.stream()
                    .map(conceptRepository::getOrCreate)
                    .toList();

            // Co-occurrence: alle Konzeptpaare dieses Chunks verlinken
            for (int i = 0; i < ids.size(); i++) {
                for (int j = i + 1; j < ids.size(); j++) {
                    conceptRepository.addLink(ids.get(i), ids.get(j));
                }
            }
            processedChunks++;
            extractedConcepts += concepts.size();
        }

        return new BuildResult(processedChunks, extractedConcepts);
    }

    /** Liefert Graphdaten für D3.js – Knoten mit Grad-Zentralität, Kanten mit Gewicht. */
    public GraphData getGraphData() {
        List<ConceptRepository.ConceptNode> nodes = conceptRepository.findAllNodes();
        List<ConceptRepository.ConceptLink> links = conceptRepository.findAllLinks();

        SimpleWeightedGraph<Long, DefaultWeightedEdge> graph =
                graphBuilder.build(nodes, links);
        Map<Long, Integer> degrees = graphBuilder.computeDegrees(graph);

        List<NodeDto> nodeDtos = nodes.stream()
                .map(n -> new NodeDto(n.id(), n.name(), degrees.getOrDefault(n.id(), 0)))
                .filter(n -> n.degree() > 0) // isolierte Knoten ausblenden
                .toList();

        List<LinkDto> linkDtos = links.stream()
                .map(l -> new LinkDto(l.conceptAId(), l.conceptBId(), l.weight()))
                .toList();

        return new GraphData(nodeDtos, linkDtos);
    }

    public record BuildResult(int processedChunks, int extractedConcepts) {}
    public record GraphData(List<NodeDto> nodes, List<LinkDto> links) {}
    public record NodeDto(long id, String name, int degree) {}
    public record LinkDto(long source, long target, double weight) {}
}
