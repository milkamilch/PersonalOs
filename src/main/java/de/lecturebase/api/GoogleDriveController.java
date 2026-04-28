package de.lecturebase.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.lecturebase.ingestion.IngestionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.*;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/upload/gdrive")
public class GoogleDriveController {

    private static final Pattern FILE_ID_PATTERN = Pattern.compile(
            "(?:docs\\.google\\.com/(?:document|spreadsheets|presentation)/d/|drive\\.google\\.com/(?:file/d/|open\\?id=))([A-Za-z0-9_-]+)");

    private static final Pattern FOLDER_ID_PATTERN = Pattern.compile(
            "drive\\.google\\.com/drive/(?:u/\\d+/)?folders/([A-Za-z0-9_-]+)");

    private static final Set<String> SUPPORTED_MIME = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.google-apps.document",
            "application/vnd.google-apps.presentation",
            "application/vnd.google-apps.spreadsheet"
    );

    @Value("${google.drive.api.key:}")
    private String driveApiKey;

    private final IngestionService ingestionService;
    private final ObjectMapper     objectMapper = new ObjectMapper();
    private final HttpClient       httpClient   = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public GoogleDriveController(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping
    public ResponseEntity<?> importFromDrive(@RequestBody Map<String, String> body) throws Exception {
        String url = body.get("url");
        if (url == null || url.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "URL fehlt"));

        // Folder import
        String folderId = extractFolderId(url);
        if (folderId != null) return importFolder(folderId);

        // Single file import
        String fileId = extractFileId(url);
        if (fileId == null)
            return ResponseEntity.badRequest().body(Map.of("error",
                "Ungültige Google Drive URL – bitte den Freigabe-Link einfügen"));

        String downloadUrl = buildDownloadUrl(url, fileId);
        File temp = downloadToTemp(downloadUrl, fileId);
        if (temp == null)
            return ResponseEntity.status(502).body(Map.of(
                "error", "Datei konnte nicht heruntergeladen werden. Bitte sicherstellen, dass sie auf 'Jeder mit Link' geteilt wurde."));

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

    private ResponseEntity<?> importFolder(String folderId) throws Exception {
        if (driveApiKey == null || driveApiKey.isBlank()) {
            return ResponseEntity.status(501).body(Map.of(
                "error", "Ordner-Import benötigt einen Google Drive API-Key. " +
                         "Bitte GOOGLE_DRIVE_API_KEY in der .env-Datei konfigurieren."));
        }

        List<Map<String, Object>> files = listFolderFiles(folderId);
        if (files.isEmpty())
            return ResponseEntity.ok(Map.of("results", List.of(), "message",
                "Keine unterstützten Dateien im Ordner gefunden (PDF, DOCX, Google Docs/Slides)"));

        List<Map<String, Object>> results = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (Map<String, Object> file : files) {
            String fileId   = (String) file.get("id");
            String name     = (String) file.get("name");
            String mimeType = (String) file.get("mimeType");
            try {
                String dlUrl = buildDownloadUrlForMime(fileId, mimeType);
                File temp = downloadToTemp(dlUrl, fileId);
                if (temp == null) { errors.add(name + " (Download fehlgeschlagen)"); continue; }
                try {
                    IngestionService.IngestionResult r = ingestionService.ingest(temp);
                    results.add(Map.of(
                        "documentId", r.documentId(),
                        "name",       r.name(),
                        "pages",      r.pages(),
                        "chunks",     r.chunks()
                    ));
                } finally { temp.delete(); }
            } catch (Exception e) {
                errors.add(name + " (" + e.getMessage() + ")");
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("results", results);
        response.put("total",   files.size());
        response.put("ok",      results.size());
        if (!errors.isEmpty()) response.put("errors", errors);
        return ResponseEntity.ok(response);
    }

    private List<Map<String, Object>> listFolderFiles(String folderId) throws Exception {
        String q = URLEncoder.encode("'" + folderId + "' in parents and trashed=false", StandardCharsets.UTF_8);
        String fields = URLEncoder.encode("files(id,name,mimeType)", StandardCharsets.UTF_8);
        String apiUrl = "https://www.googleapis.com/drive/v3/files?q=" + q +
                        "&fields=" + fields + "&pageSize=100&key=" + driveApiKey;

        HttpRequest req = HttpRequest.newBuilder().uri(URI.create(apiUrl)).GET().build();
        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

        if (resp.statusCode() != 200)
            throw new IOException("Drive API Fehler " + resp.statusCode() + ": " + resp.body());

        JsonNode root = objectMapper.readTree(resp.body());
        List<Map<String, Object>> result = new ArrayList<>();
        for (JsonNode f : root.path("files")) {
            String mime = f.path("mimeType").asText();
            if (SUPPORTED_MIME.contains(mime)) {
                result.add(Map.of(
                    "id",       f.path("id").asText(),
                    "name",     f.path("name").asText(),
                    "mimeType", mime
                ));
            }
        }
        return result;
    }

    private String extractFileId(String url) {
        Matcher m = FILE_ID_PATTERN.matcher(url);
        return m.find() ? m.group(1) : null;
    }

    private String extractFolderId(String url) {
        Matcher m = FOLDER_ID_PATTERN.matcher(url);
        return m.find() ? m.group(1) : null;
    }

    private String buildDownloadUrl(String originalUrl, String fileId) {
        if (originalUrl.contains("docs.google.com/document"))
            return "https://docs.google.com/document/d/"      + fileId + "/export?format=pdf";
        if (originalUrl.contains("docs.google.com/spreadsheets"))
            return "https://docs.google.com/spreadsheets/d/"  + fileId + "/export?format=pdf";
        if (originalUrl.contains("docs.google.com/presentation"))
            return "https://docs.google.com/presentation/d/" + fileId + "/export?format=pdf";
        return "https://drive.google.com/uc?export=download&confirm=t&id=" + fileId;
    }

    private String buildDownloadUrlForMime(String fileId, String mimeType) {
        return switch (mimeType) {
            case "application/vnd.google-apps.document" ->
                "https://docs.google.com/document/d/" + fileId + "/export?format=pdf";
            case "application/vnd.google-apps.presentation" ->
                "https://docs.google.com/presentation/d/" + fileId + "/export?format=pdf";
            case "application/vnd.google-apps.spreadsheet" ->
                "https://docs.google.com/spreadsheets/d/" + fileId + "/export?format=pdf";
            default ->
                "https://drive.google.com/uc?export=download&confirm=t&id=" + fileId;
        };
    }

    private File downloadToTemp(String downloadUrl, String fileId) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(downloadUrl))
                .header("User-Agent", "Mozilla/5.0")
                .GET().build();

        HttpResponse<byte[]> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());
        if (resp.statusCode() != 200) return null;

        byte[] data = resp.body();
        if (data.length < 100) return null;
        String start = new String(data, 0, Math.min(512, data.length));
        if (start.trim().startsWith("<!DOCTYPE") || start.trim().startsWith("<html")) return null;

        String suffix = downloadUrl.contains("format=pdf") ? ".pdf" : "_" + fileId + ".bin";
        File temp = Files.createTempFile("lb_gdrive_", suffix).toFile();
        try (FileOutputStream fos = new FileOutputStream(temp)) { fos.write(data); }
        return temp;
    }
}
