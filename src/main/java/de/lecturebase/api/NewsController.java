package de.lecturebase.api;

import de.lecturebase.service.NewsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public ResponseEntity<?> news(@RequestParam String feed) {
        if (!newsService.isKnownFeed(feed))
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown feed: " + feed));
        try {
            return ResponseEntity.ok(newsService.fetchNews(feed));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        }
    }
}
