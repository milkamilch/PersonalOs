package de.lecturebase.ingestion;

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

    public List<PageContent> parsePdf(File file) throws IOException {
        List<PageContent> pages = new ArrayList<>();
        try (PDDocument doc = PDDocument.load(file)) {
            PDFTextStripper stripper = new PDFTextStripper();
            int totalPages = doc.getNumberOfPages();
            for (int i = 1; i <= totalPages; i++) {
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String text = stripper.getText(doc).trim();
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
