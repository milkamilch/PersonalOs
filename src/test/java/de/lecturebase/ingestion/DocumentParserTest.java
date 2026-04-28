package de.lecturebase.ingestion;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Path;
import java.util.List;

import de.lecturebase.ai.OcrService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DocumentParserTest {

    private final OcrService ocrService = mock(OcrService.class);
    {
        when(ocrService.isAvailable()).thenReturn(false);
    }
    private final DocumentParser parser = new DocumentParser(ocrService);

    @TempDir
    Path tempDir;

    @Test
    void parsePdfExtractsText() throws Exception {
        File pdf = createTestPdf("Vorlesung Algorithmen und Datenstrukturen");
        List<DocumentParser.PageContent> pages = parser.parsePdf(pdf);
        assertThat(pages).hasSize(1);
        assertThat(pages.get(0).text()).contains("Vorlesung");
        assertThat(pages.get(0).pageNumber()).isEqualTo(1);
    }

    @Test
    void parsePdfMultiplePages() throws Exception {
        File pdf = createMultiPagePdf("Seite eins", "Seite zwei");
        List<DocumentParser.PageContent> pages = parser.parsePdf(pdf);
        assertThat(pages).hasSize(2);
        assertThat(pages.get(0).pageNumber()).isEqualTo(1);
        assertThat(pages.get(1).pageNumber()).isEqualTo(2);
        assertThat(pages.get(0).text()).contains("Seite eins");
        assertThat(pages.get(1).text()).contains("Seite zwei");
    }

    @Test
    void parsePdfSkipsBlankPages() throws Exception {
        File pdf = createPdfWithBlankPage();
        List<DocumentParser.PageContent> pages = parser.parsePdf(pdf);
        // leere Seiten werden nicht zurückgegeben
        assertThat(pages).allSatisfy(p -> assertThat(p.text()).isNotBlank());
    }

    @Test
    void parseDocxExtractsText() throws Exception {
        File docx = createTestDocx("Grundlagen der Informatik");
        List<DocumentParser.PageContent> pages = parser.parseDocx(docx);
        assertThat(pages).hasSize(1);
        assertThat(pages.get(0).text()).contains("Grundlagen der Informatik");
        assertThat(pages.get(0).pageNumber()).isEqualTo(1);
    }

    @Test
    void parseDocxMultipleParagraphs() throws Exception {
        File docx = createDocxWithParagraphs("Erster Absatz", "Zweiter Absatz", "Dritter Absatz");
        List<DocumentParser.PageContent> pages = parser.parseDocx(docx);
        String text = pages.get(0).text();
        assertThat(text).contains("Erster Absatz", "Zweiter Absatz", "Dritter Absatz");
    }

    // --- Hilfsmethoden ---

    private File createTestPdf(String text) throws Exception {
        File file = tempDir.resolve("test.pdf").toFile();
        try (PDDocument doc = new PDDocument()) {
            addPage(doc, text);
            doc.save(file);
        }
        return file;
    }

    private File createMultiPagePdf(String... texts) throws Exception {
        File file = tempDir.resolve("multi.pdf").toFile();
        try (PDDocument doc = new PDDocument()) {
            for (String text : texts) addPage(doc, text);
            doc.save(file);
        }
        return file;
    }

    private File createPdfWithBlankPage() throws Exception {
        File file = tempDir.resolve("blank.pdf").toFile();
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage()); // leere Seite
            addPage(doc, "Inhalt auf Seite zwei");
            doc.save(file);
        }
        return file;
    }

    private void addPage(PDDocument doc, String text) throws Exception {
        PDPage page = new PDPage();
        doc.addPage(page);
        try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
            stream.beginText();
            stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
            stream.newLineAtOffset(50, 700);
            stream.showText(text);
            stream.endText();
        }
    }

    private File createTestDocx(String text) throws Exception {
        File file = tempDir.resolve("test.docx").toFile();
        try (XWPFDocument doc = new XWPFDocument();
             FileOutputStream out = new FileOutputStream(file)) {
            doc.createParagraph().createRun().setText(text);
            doc.write(out);
        }
        return file;
    }

    private File createDocxWithParagraphs(String... texts) throws Exception {
        File file = tempDir.resolve("multi.docx").toFile();
        try (XWPFDocument doc = new XWPFDocument();
             FileOutputStream out = new FileOutputStream(file)) {
            for (String text : texts) doc.createParagraph().createRun().setText(text);
            doc.write(out);
        }
        return file;
    }
}
