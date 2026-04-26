package de.lecturebase.api;

import de.lecturebase.ai.MindMapService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mindmap")
public class MindMapController {

    private final MindMapService mindMapService;

    public MindMapController(MindMapService mindMapService) {
        this.mindMapService = mindMapService;
    }

    /**
     * Startet die Konzeptextraktion für ein Dokument (oder alle wenn documentId fehlt).
     * Kann je nach Anzahl der Chunks einige Minuten dauern.
     */
    @PostMapping("/build")
    public MindMapService.BuildResult build(
            @RequestParam(required = false) Long documentId) {
        return mindMapService.build(documentId);
    }

    /** Gibt den aktuellen Konzeptgraphen als JSON zurück (für D3.js). */
    @GetMapping
    public MindMapService.GraphData getGraph() {
        return mindMapService.getGraphData();
    }
}
