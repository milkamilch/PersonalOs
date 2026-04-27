package de.lecturebase.ai;

import de.lecturebase.storage.ConceptRepository;
import org.jgrapht.alg.clustering.LabelPropagationClustering;
import org.jgrapht.alg.interfaces.ClusteringAlgorithm;
import org.jgrapht.graph.DefaultWeightedEdge;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
            if (!graph.containsVertex(l.conceptAId()) || !graph.containsVertex(l.conceptBId())) return;
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

    /**
     * Ermittelt Cluster per Label-Propagation und liefert eine Map von Knoten-ID → Cluster-ID.
     * Isolierte Knoten (kein Graph) erhalten alle Cluster 0.
     */
    public Map<Long, Integer> computeClusters(
            SimpleWeightedGraph<Long, DefaultWeightedEdge> graph) {

        Map<Long, Integer> clusterMap = new HashMap<>();
        if (graph.vertexSet().isEmpty()) return clusterMap;

        LabelPropagationClustering<Long, DefaultWeightedEdge> alg =
                new LabelPropagationClustering<>(graph);
        ClusteringAlgorithm.Clustering<Long> clustering = alg.getClustering();

        List<Set<Long>> clusters = clustering.getClusters();
        for (int i = 0; i < clusters.size(); i++) {
            final int id = i;
            clusters.get(i).forEach(v -> clusterMap.put(v, id));
        }
        return clusterMap;
    }
}
