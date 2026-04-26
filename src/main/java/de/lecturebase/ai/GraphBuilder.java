package de.lecturebase.ai;

import de.lecturebase.storage.ConceptRepository;
import org.jgrapht.graph.DefaultWeightedEdge;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GraphBuilder {

    /**
     * Baut einen JGraphT-Graphen aus Datenbankknoten und -kanten.
     * Knoten = Konzept-IDs, Kantengewicht = co-occurrence-Häufigkeit.
     */
    public SimpleWeightedGraph<Long, DefaultWeightedEdge> build(
            List<ConceptRepository.ConceptNode> nodes,
            List<ConceptRepository.ConceptLink> links) {

        SimpleWeightedGraph<Long, DefaultWeightedEdge> graph =
                new SimpleWeightedGraph<>(DefaultWeightedEdge.class);

        nodes.forEach(n -> graph.addVertex(n.id()));
        links.forEach(l -> {
            DefaultWeightedEdge edge = graph.addEdge(l.conceptAId(), l.conceptBId());
            if (edge != null) graph.setEdgeWeight(edge, l.weight());
        });
        return graph;
    }

    /**
     * Berechnet den Grad (Anzahl direkter Verbindungen) jedes Knotens.
     * Wird in D3.js für die Knotengröße verwendet.
     */
    public Map<Long, Integer> computeDegrees(
            SimpleWeightedGraph<Long, DefaultWeightedEdge> graph) {

        Map<Long, Integer> degrees = new HashMap<>();
        graph.vertexSet().forEach(v -> degrees.put(v, graph.degreeOf(v)));
        return degrees;
    }
}
