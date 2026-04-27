package de.lecturebase.api;

import de.lecturebase.ingestion.IngestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.file.Files;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/upload/gdrive")
public class GoogleDriveController {

    private static final Pattern DOC_ID_PATTERN = Pattern.compile(
            "(?:docs\\.google\\.com/(?:document|spreadsheets|presentation)/d/|drive\\.google\\.com/(?:file/d/|open\\?id=))([A-Za-z0-9_-]+)");

    private final IngestionService ingestionService;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public GoogleDriveController(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping
    public ResponseEntity<?> importFromDrive(@RequestBody Map<String, String> body) throws Exception {
        String url = body.get("url");
        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "URL fehlt"));
        }

        String fileId = extractFileId(url);
        if (fileId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ungültige Google Drive URL – bitte den Freigabe-Link einfügen"));
        }

        String downloadUrl = buildDownloadUrl(url, fileId);
        File temp = downloadToTemp(downloadUrl, fileId);
        if (temp == null) {
            return ResponseEntity.status(502).body(Map.of(
                "error", "Datei konnte nicht heruntergeladen werden. Bitte sicherstellen, dass die Datei auf 'Jeder mit Link' geteilt wurde."));
        }

        try {
            IngestionService.IngestionResult result = ingestionService.ingest(temp);
            return ResponseEntity.ok(Map.of(
                "documentId", result.documentId(),
                "name",       result.name(),
                "pages",      result.pages(),
                "chunks",     result.chunks()
            ));
        } finally {
            temp.delete();
        }
    }

    private String extractFileId(String url) {
        Matcher m = DOC_ID_PATTERN.matcher(url);
        return m.find() ? m.group(1) : null;
    }

    private String buildDownloadUrl(String originalUrl, String fileId) {
        if (originalUrl.contains("docs.google.com/document"))      return "https://docs.google.com/document/d/"      + fileId + "/export?format=pdf";
        if (originalUrl.contains("docs.google.com/spreadsheets"))  return "https://docs.google.com/spreadsheets/d/"  + fileId + "/export?format=pdf";
        if (originalUrl.contains("docs.google.com/presentation"))  return "https://docs.google.com/presentation/d/" + fileId + "/export?format=pdf";
        // Regular Drive file
        return "https://drive.google.com/uc?export=download&confirm=t&id=" + fileId;
    }

    private File downloadToTemp(String downloadUrl, String fileId) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(downloadUrl))
                .header("User-Agent", "Mozilla/5.0")
                .GET()
                .build();

        HttpResponse<byte[]> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());

        if (resp.statusCode() != 200) return null;

        byte[] data = resp.body();
        // Reject HTML responses (e.g. login page or virus-scan warning)
        if (data.length < 100) return null;
        String start = new String(data, 0, Math.min(512, data.length));
        if (start.trim().startsWith("<!DOCTYPE") || start.trim().startsWith("<html")) return null;

        String suffix = downloadUrl.contains("format=pdf") ? ".pdf" : "_" + fileId + ".pdf";
        File temp = Files.createTempFile("lb_gdrive_", suffix).toFile();
        try (FileOutputStream fos = new FileOutputStream(temp)) {
            fos.write(data);
        }
        return temp;
    }
}
