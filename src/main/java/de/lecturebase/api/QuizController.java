package de.lecturebase.api;

import de.lecturebase.ai.QuizService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    /** Generate exam questions for a document */
    @GetMapping("/generate")
    public ResponseEntity<List<Map<String, Object>>> generate(
            @RequestParam long documentId,
            @RequestParam(defaultValue = "5") int count) {
        return ResponseEntity.ok(quizService.generateQuestions(documentId, count));
    }

    /** Evaluate a student's answer */
    @PostMapping("/evaluate")
    public ResponseEntity<Map<String, Object>> evaluate(@RequestBody EvalRequest req) {
        return ResponseEntity.ok(quizService.evaluate(req.question(), req.chunkContext(), req.userAnswer()));
    }

    public record EvalRequest(String question, String chunkContext, String userAnswer) {}
}
