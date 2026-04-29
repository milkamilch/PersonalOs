package de.lecturebase.api;

import de.lecturebase.ingestion.IngestionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/audio")
public class AudioController {

    private final IngestionService ingestionService;
    private final RestTemplate     restTemplate = new RestTemplate();

    @Value("${openai.api.key:}")
    private String openaiKey;

    public AudioController(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping("/transcribe")
    public ResponseEntity<Map<String, Object>> transcribe(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "true") boolean ingest) throws Exception {

        if (openaiKey == null || openaiKey.isBlank()) {
            return ResponseEntity.status(503).body(Map.of(
                "error", "OPENAI_API_KEY nicht konfiguriert"));
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "audio.mp3";

        // Call Whisper API
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(openaiKey);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override public String getFilename() { return filename; }
        };
        body.add("file", resource);
        body.add("model", "whisper-1");
        body.add("language", "de");

        HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(body, headers);
        ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
            "https://api.openai.com/v1/audio/transcriptions",
            HttpMethod.POST, req,
            new org.springframework.core.ParameterizedTypeReference<>() {});

        String text = (String) resp.getBody().get("text");
        if (text == null || text.isBlank()) {
            return ResponseEntity.ok(Map.of("transcription", "", "ingested", false));
        }

        if (ingest) {
            String docName = filename.replaceAll("\\.[^.]+$", "") + " (Transkript)";
            IngestionService.IngestionResult result = ingestionService.ingestText(text, docName);
            return ResponseEntity.ok(Map.of(
                "transcription", text,
                "ingested",      true,
                "documentId",    result.documentId(),
                "documentName",  result.name(),
                "chunks",        result.chunks()
            ));
        }

        return ResponseEntity.ok(Map.of("transcription", text, "ingested", false));
    }
}
