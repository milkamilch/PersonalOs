package de.lecturebase.api;

import de.lecturebase.ingestion.IngestionService;
import de.lecturebase.model.Document;
import de.lecturebase.storage.ChunkRepository;
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

    private final IngestionService ingestionService;
    private final ChunkRepository chunkRepository;

    public IngestionController(IngestionService ingestionService, ChunkRepository chunkRepository) {
        this.ingestionService = ingestionService;
        this.chunkRepository = chunkRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) throws IOException {
        File temp = Files.createTempFile("lb_", "_" + file.getOriginalFilename()).toFile();
        file.transferTo(temp);

        IngestionService.IngestionResult result = ingestionService.ingest(temp);
        temp.delete();

        return ResponseEntity.ok(Map.of(
            "documentId", result.documentId(),
            "name",       result.name(),
            "pages",      result.pages(),
            "chunks",     result.chunks()
        ));
    }

    @GetMapping("/documents")
    public List<Document> listDocuments() {
        return chunkRepository.findAllDocuments();
    }
}
