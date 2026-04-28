package de.lecturebase.ai;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * OCR für gescannte PDF-Seiten via Claude Vision.
 * Wird nur aufgerufen wenn PDFBox auf einer Seite keinen Text findet.
 */
@Service
public class OcrService {

    private static final String SYSTEM = "Du bist ein OCR-Assistent. Transkribiere den gesamten sichtbaren Text aus dem Bild exakt und vollständig. Nur der Text, kein Kommentar.";
    private static final int    DPI    = 150;

    private final boolean available;
    private final org.springframework.web.client.RestClient restClient;

    public OcrService(
            @Value("${claude.api.key:}") String apiKey,
            @Value("${claude.api.base-url:https://api.anthropic.com}") String baseUrl) {
        this.available  = apiKey != null && !apiKey.isBlank();
        this.restClient = available
            ? org.springframework.web.client.RestClient.builder()
                  .baseUrl(baseUrl)
                  .defaultHeader("x-api-key", apiKey)
                  .defaultHeader("anthropic-version", "2023-06-01")
                  .defaultHeader("content-type", "application/json")
                  .build()
            : null;
    }

    public boolean isAvailable() { return available; }

    /**
     * Rendert eine PDF-Seite als Bild und schickt sie an Claude Vision zur Texterkennung.
     * @return Erkannter Text, oder leer wenn OCR nicht verfügbar/fehlgeschlagen.
     */
    public String transcribePage(File pdfFile, int pageIndex) {
        if (!available) return "";
        try (PDDocument doc = Loader.loadPDF(pdfFile)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            BufferedImage img    = renderer.renderImageWithDPI(pageIndex, DPI);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "PNG", baos);
            String base64 = Base64.getEncoder().encodeToString(baos.toByteArray());

            Map<String, Object> imageContent = Map.of(
                "type", "image",
                "source", Map.of(
                    "type",       "base64",
                    "media_type", "image/png",
                    "data",       base64
                )
            );
            Map<String, Object> textContent = Map.of(
                "type", "text",
                "text", "Transkribiere alle Texte aus diesem Dokument-Scan vollständig:"
            );

            Map<String, Object> body = Map.of(
                "model",      "claude-haiku-4-5-20251001",
                "max_tokens", 2048,
                "system",     SYSTEM,
                "messages",   List.of(Map.of("role", "user", "content", List.of(imageContent, textContent)))
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/v1/messages")
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
            return (String) content.get(0).get("text");

        } catch (Exception e) {
            return "";
        }
    }
}
