package de.lecturebase.ai;

import de.lecturebase.model.Chunk;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.ConceptRepository;
import org.jgrapht.graph.DefaultWeightedEdge;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

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

    public BuildResult build(Long documentId, boolean rebuild) {
        return build(documentId, rebuild, null);
    }

    public BuildResult build(Long documentId, boolean rebuild, Consumer<Map<String, Object>> onProgress) {
        if (!rebuild && documentId != null && conceptRepository.hasBuilt(documentId)) {
            long concepts = conceptRepository.countConceptsForDocument(documentId);
            return new BuildResult(0, (int) concepts, true);
        }

        List<Chunk> chunks = documentId != null
                ? chunkRepository.findChunksByDocument(documentId)
                : chunkRepository.findAllChunks();

        int processedChunks   = 0;
        int extractedConcepts = 0;
        int totalBatches      = (int) Math.ceil((double) chunks.size() / ConceptExtractor.BATCH_SIZE);
        int batchNum          = 0;

        for (int i = 0; i < chunks.size(); i += ConceptExtractor.BATCH_SIZE) {
            batchNum++;
            List<Chunk> batch = chunks.subList(i, Math.min(i + ConceptExtractor.BATCH_SIZE, chunks.size()));
            List<String> texts = batch.stream().map(Chunk::getText).toList();
            List<List<String>> batchResults = conceptExtractor.extractBatch(texts);

            for (int j = 0; j < batch.size(); j++) {
                List<String> concepts = j < batchResults.size() ? batchResults.get(j) : List.of();
                if (concepts.isEmpty()) continue;

                List<Long> ids = concepts.stream()
                        .map(conceptRepository::getOrCreate)
                        .toList();

                long chunkDocId = batch.get(j).getDocumentId();
                for (Long conceptId : ids) {
                    conceptRepository.linkToDocument(conceptId, chunkDocId);
                }

                for (int a = 0; a < ids.size(); a++) {
                    for (int b = a + 1; b < ids.size(); b++) {
                        conceptRepository.addLink(ids.get(a), ids.get(b));
                    }
                }
                processedChunks++;
                extractedConcepts += concepts.size();
            }

            if (onProgress != null) {
                onProgress.accept(Map.of(
                    "batch", batchNum, "totalBatches", totalBatches,
                    "processedChunks", processedChunks, "extractedConcepts", extractedConcepts
                ));
            }
        }

        if (documentId != null) {
            conceptRepository.clearDocumentLinks(documentId);
            conceptRepository.markBuilt(documentId);
        }
        return new BuildResult(processedChunks, extractedConcepts, false);
    }

    public GraphData getGraphData() {
        List<ConceptRepository.ConceptNode> nodes = conceptRepository.findAllNodes();
        List<ConceptRepository.ConceptLink> links = conceptRepository.findAllLinks();

        SimpleWeightedGraph<Long, DefaultWeightedEdge> graph = graphBuilder.build(nodes, links);
        Map<Long, Integer> degrees  = graphBuilder.computeDegrees(graph);
        Map<Long, Integer> clusters = graphBuilder.computeClusters(graph);

        Map<Long, List<String>> docNames = conceptRepository.findDocumentNamesForAllConcepts();

        List<NodeDto> nodeDtos = nodes.stream()
                .map(n -> new NodeDto(
                        n.id(), n.name(),
                        degrees.getOrDefault(n.id(), 0),
                        clusters.getOrDefault(n.id(), 0),
                        docNames.getOrDefault(n.id(), List.of())))
                .filter(n -> n.degree() > 0)
                .toList();

        List<LinkDto> linkDtos = links.stream()
                .map(l -> new LinkDto(l.conceptAId(), l.conceptBId(), l.weight()))
                .toList();

        return new GraphData(nodeDtos, linkDtos);
    }

    public record BuildResult(int processedChunks, int extractedConcepts, boolean cached) {}
    public record GraphData(List<NodeDto> nodes, List<LinkDto> links) {}
    public record NodeDto(long id, String name, int degree, int clusterId, List<String> documents) {}
    public record LinkDto(long source, long target, double weight) {}
}
