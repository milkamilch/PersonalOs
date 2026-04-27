package de.lecturebase.ai;

import de.lecturebase.storage.ConceptRepository;
import org.jgrapht.graph.DefaultWeightedEdge;
import org.jgrapht.graph.SimpleWeightedGraph;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GraphBuilderTest {

    private final GraphBuilder builder = new GraphBuilder();

    @Test
    void knotenWerdenImGraphAngelegt() {
        var nodes = List.of(node(1, "Quicksort"), node(2, "Mergesort"), node(3, "Rekursion"));
        var graph = builder.build(nodes, List.of());
        assertThat(graph.vertexSet()).containsExactlyInAnyOrder(1L, 2L, 3L);
    }

    @Test
    void kantenWerdenMitGewichtAngelegt() {
        var nodes = List.of(node(1, "A"), node(2, "B"));
        var links = List.of(link(1, 2, 3.0));
        var graph = builder.build(nodes, links);
        assertThat(graph.edgeSet()).hasSize(1);
        DefaultWeightedEdge edge = graph.getEdge(1L, 2L);
        assertThat(graph.getEdgeWeight(edge)).isEqualTo(3.0);
    }

    @Test
    void gradBerechnungIstKorrekt() {
        var nodes = List.of(node(1, "A"), node(2, "B"), node(3, "C"));
        var links = List.of(link(1, 2, 1.0), link(1, 3, 1.0));
        var graph = builder.build(nodes, links);
        Map<Long, Integer> degrees = builder.computeDegrees(graph);
        assertThat(degrees.get(1L)).isEqualTo(2); // verbunden mit B und C
        assertThat(degrees.get(2L)).isEqualTo(1);
        assertThat(degrees.get(3L)).isEqualTo(1);
    }

    @Test
    void leererGraphFunktioniertOhneException() {
        SimpleWeightedGraph<Long, DefaultWeightedEdge> graph = builder.build(List.of(), List.of());
        assertThat(graph.vertexSet()).isEmpty();
        assertThat(graph.edgeSet()).isEmpty();
        assertThat(builder.computeDegrees(graph)).isEmpty();
    }

    @Test
    void ungueltigeKanteOhneKnotenWirdIgnoriert() {
        var nodes = List.of(node(1, "A")); // Knoten 2 existiert nicht
        var links = List.of(link(1, 2, 1.0));
        SimpleWeightedGraph<Long, DefaultWeightedEdge> graph = builder.build(nodes, links);
        assertThat(graph.edgeSet()).isEmpty(); // kein Absturz, kein Edge
    }

    @Test
    void computeClustersLeererGraphGibtLeereMapZurueck() {
        var graph = builder.build(List.of(), List.of());
        assertThat(builder.computeClusters(graph)).isEmpty();
    }

    @Test
    void computeClustersTrenntZweiKomponenten() {
        // Zwei getrennte Komponenten: {A,B} und {C,D}
        var nodes = List.of(node(1, "A"), node(2, "B"), node(3, "C"), node(4, "D"));
        var links = List.of(link(1, 2, 1.0), link(3, 4, 1.0));
        var graph = builder.build(nodes, links);

        Map<Long, Integer> clusters = builder.computeClusters(graph);

        assertThat(clusters).containsKeys(1L, 2L, 3L, 4L);
        // A und B müssen im gleichen Cluster sein
        assertThat(clusters.get(1L)).isEqualTo(clusters.get(2L));
        // C und D müssen im gleichen Cluster sein
        assertThat(clusters.get(3L)).isEqualTo(clusters.get(4L));
        // Die beiden Cluster müssen verschieden sein
        assertThat(clusters.get(1L)).isNotEqualTo(clusters.get(3L));
    }

    @Test
    void computeClustersSingleNodeBekommtCluster() {
        var nodes = List.of(node(1, "Solo"));
        var graph = builder.build(nodes, List.of());
        Map<Long, Integer> clusters = builder.computeClusters(graph);
        assertThat(clusters).containsKey(1L);
    }

    private ConceptRepository.ConceptNode node(long id, String name) {
        return new ConceptRepository.ConceptNode(id, name);
    }

    private ConceptRepository.ConceptLink link(long a, long b, double weight) {
        return new ConceptRepository.ConceptLink(a, b, "nameA", "nameB", weight);
    }
}
