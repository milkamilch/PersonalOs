package de.lecturebase.api;

import de.lecturebase.ai.FlashcardGenerator;
import de.lecturebase.model.Flashcard;
import de.lecturebase.storage.FlashcardRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flashcards")
public class FlashcardController {

    private final FlashcardGenerator   generator;
    private final FlashcardRepository  repository;

    public FlashcardController(FlashcardGenerator generator, FlashcardRepository repository) {
        this.generator  = generator;
        this.repository = repository;
    }

    /** Generiert Lernkarten für ein Dokument (überschreibt bestehende). */
    @PostMapping("/generate")
    public FlashcardGenerator.GenerateResult generate(@RequestParam long documentId) {
        repository.deleteByDocument(documentId);
        return generator.generateForDocument(documentId);
    }

    @GetMapping
    public List<Flashcard> list(@RequestParam(required = false) Long documentId) {
        return documentId != null
                ? repository.findByDocument(documentId)
                : repository.findAll();
    }
}
