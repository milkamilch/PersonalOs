package de.lecturebase.service;

import de.lecturebase.repository.MediaRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class MediaService {

    private final MediaRepository repo;

    public MediaService(MediaRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list(String type, String status) {
        return repo.findAll(type, status);
    }

    public Map<String, Object> create(Map<String, Object> body) {
        return repo.create(
            (String) body.getOrDefault("type", "book"),
            (String) body.getOrDefault("title", ""),
            (String) body.getOrDefault("creator", ""),
            (String) body.getOrDefault("status", "want"),
            (String) body.getOrDefault("notes", ""),
            body.containsKey("totalPages") ? ((Number) body.get("totalPages")).intValue() : 0);
    }

    public Map<String, Object> update(long id, Map<String, Object> body) {
        if (body.containsKey("title") || body.containsKey("creator") || body.containsKey("totalPages")) {
            String title       = body.containsKey("title")      ? (String) body.get("title")      : null;
            String creator     = body.containsKey("creator")    ? (String) body.get("creator")    : null;
            Integer totalPages = body.containsKey("totalPages") && body.get("totalPages") != null
                ? ((Number) body.get("totalPages")).intValue() : null;
            repo.updateDetails(id, title, creator, totalPages);
        }
        if (body.containsKey("status"))
            repo.updateStatus(id, (String) body.get("status"));
        if (body.containsKey("rating")) {
            Object r = body.get("rating");
            repo.updateRating(id, r == null ? null : ((Number) r).intValue());
        }
        if (body.containsKey("notes"))
            repo.updateNotes(id, (String) body.get("notes"));
        if (body.containsKey("currentPage"))
            repo.updateProgress(id, ((Number) body.get("currentPage")).intValue());
        return repo.findById(id);
    }

    public Map<String, Object> addPages(long id, int pages) {
        return repo.addPages(id, pages);
    }

    public void delete(long id) { repo.delete(id); }

    public Map<String, Object> stats() {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("booksRead",      repo.count("book",   "done"));
        r.put("booksReading",   repo.count("book",   "in_progress"));
        r.put("booksWant",      repo.count("book",   "want"));
        r.put("moviesWatched",  repo.count("movie",  "done"));
        r.put("seriesWatching", repo.count("series", "in_progress"));
        r.put("seriesWant",     repo.count("series", "want") + repo.count("movie", "want"));
        return r;
    }
}
