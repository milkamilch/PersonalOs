package de.lecturebase.api;

import de.lecturebase.ai.SummaryService;
import de.lecturebase.storage.SummaryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/summaries")
public class SummaryController {

    private final SummaryService    summaryService;
    private final SummaryRepository summaryRepository;

    public SummaryController(SummaryService summaryService, SummaryRepository summaryRepository) {
        this.summaryService    = summaryService;
        this.summaryRepository = summaryRepository;
    }

    /** Generiert eine Zusammenfassung für ein Dokument und speichert sie. */
    @PostMapping("/generate")
    public SummaryService.SummaryResult generate(@RequestParam long documentId) {
        return summaryService.generateForDocument(documentId);
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<String> get(@PathVariable long documentId) {
        return summaryRepository.findByDocument(documentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
