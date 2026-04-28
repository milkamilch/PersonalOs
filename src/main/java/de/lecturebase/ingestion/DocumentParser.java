package de.lecturebase.ingestion;

import de.lecturebase.ai.OcrService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class DocumentParser {

    private static final int MIN_TEXT_LENGTH = 50;

    private final OcrService ocrService;

    public DocumentParser(OcrService ocrService) {
        this.ocrService = ocrService;
    }

    public List<PageContent> parsePdf(File file) throws IOException {
        List<PageContent> pages = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            int totalPages = doc.getNumberOfPages();
            for (int i = 1; i <= totalPages; i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String text = stripper.getText(doc).trim();

                if (text.length() < MIN_TEXT_LENGTH && ocrService.isAvailable()) {
                    // Gescannte Seite — OCR via Claude Vision
                    String ocr = ocrService.transcribePage(file, i - 1);
                    if (!ocr.isBlank()) text = ocr;
                }

                if (!text.isBlank()) {
                    pages.add(new PageContent(i, text));
                }
            }
        }
        return pages;
    }

    public List<PageContent> parseDocx(File file) throws IOException {
        try (FileInputStream fis = new FileInputStream(file);
             XWPFDocument doc = new XWPFDocument(fis)) {
            StringBuilder text = new StringBuilder();
            doc.getParagraphs().forEach(p -> {
                String line = p.getText().trim();
                if (!line.isBlank()) {
                    text.append(line).append("\n");
                }
            });
            return List.of(new PageContent(1, text.toString().trim()));
        }
    }

    public record PageContent(int pageNumber, String text) {}
}
