package de.lecturebase.api;

import de.lecturebase.ai.SemanticSearchService;
import de.lecturebase.ingestion.IngestionService;
import de.lecturebase.model.Document;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.TagRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class IngestionController {

    private final IngestionService    ingestionService;
    private final ChunkRepository     chunkRepository;
    private final TagRepository       tagRepository;
    private final SemanticSearchService semanticSearch;

    public IngestionController(IngestionService ingestionService,
                               ChunkRepository chunkRepository,
                               TagRepository tagRepository,
                               SemanticSearchService semanticSearch) {
        this.ingestionService = ingestionService;
        this.chunkRepository  = chunkRepository;
        this.tagRepository    = tagRepository;
        this.semanticSearch   = semanticSearch;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String tags) throws IOException {

        File temp = Files.createTempFile("lb_", "_" + file.getOriginalFilename()).toFile();
        file.transferTo(temp);

        IngestionService.IngestionResult result = ingestionService.ingest(temp);
        temp.delete();

        if (tags != null && !tags.isBlank()) {
            for (String tag : tags.split(",")) {
                long tagId = tagRepository.getOrCreate(tag.trim());
                tagRepository.assignToDocument(result.documentId(), tagId);
            }
        }

        return ResponseEntity.ok(Map.of(
            "documentId", result.documentId(),
            "name",       result.name(),
            "pages",      result.pages(),
            "chunks",     result.chunks(),
            "semantic",   semanticSearch.isAvailable()
        ));
    }

    @GetMapping("/documents")
    public List<Document> listDocuments(@RequestParam(required = false) String tag) {
        return tag != null ? chunkRepository.findByTag(tag) : chunkRepository.findAllDocuments();
    }

    @DeleteMapping("/documents/{id}")
    public ResponseEntity<Map<String, String>> deleteDocument(@PathVariable long id) {
        chunkRepository.deleteDocument(id);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("semantic", semanticSearch.isAvailable());
    }
}
