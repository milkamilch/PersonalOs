package de.lecturebase.api;

import de.lecturebase.ai.SemanticSearchService;
import de.lecturebase.ingestion.IngestionService;
import de.lecturebase.model.Document;
import de.lecturebase.storage.ChunkRepository;
import de.lecturebase.storage.TagRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.HexFormat;
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

    private static final Path UPLOADS_DIR = Paths.get("uploads");

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String tags) throws IOException {

        Files.createDirectories(UPLOADS_DIR);
        File temp = Files.createTempFile("lb_", "_" + file.getOriginalFilename()).toFile();
        file.transferTo(temp);

        String hash = sha256(temp);
        java.util.Optional<Document> existing = chunkRepository.findByHash(hash);
        if (existing.isPresent()) {
            temp.delete();
            return ResponseEntity.status(409).body(Map.of(
                "duplicate",    true,
                "existingId",   existing.get().getId(),
                "existingName", existing.get().getName()
            ));
        }

        // Persist file permanently so file_path stays valid for later serving
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
        Path permanent = UPLOADS_DIR.resolve(hash + "_" + originalName);
        Files.copy(temp.toPath(), permanent);
        temp.delete();

        IngestionService.IngestionResult result = ingestionService.ingest(permanent.toFile(), hash, originalName);

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

    @GetMapping("/documents/{id}/file")
    public ResponseEntity<Resource> serveFile(@PathVariable long id) {
        List<Document> docs = chunkRepository.findAllDocuments();
        Document doc = docs.stream().filter(d -> d.getId() == id).findFirst().orElse(null);
        if (doc == null) return ResponseEntity.notFound().build();

        String path = doc.getFilePath();
        if (path == null || path.startsWith("audio://")) return ResponseEntity.notFound().build();

        File f = new File(path);
        if (!f.exists()) return ResponseEntity.notFound().build();

        String contentType = path.endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + f.getName() + "\"");
        return ResponseEntity.ok().headers(headers).body(new FileSystemResource(f));
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

    private static String sha256(File file) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(Files.readAllBytes(file.toPath()));
            return HexFormat.of().formatHex(md.digest());
        } catch (Exception e) {
            return null;
        }
    }
}
