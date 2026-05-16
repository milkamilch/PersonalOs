package de.lecturebase.service;

import de.lecturebase.repository.NotesRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class NotesService {

    private final NotesRepository repo;

    public NotesService(NotesRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list() { return repo.findAll(); }

    public Map<String, Object> create(Map<String, Object> body) {
        return repo.create(
            (String) body.getOrDefault("title", ""),
            (String) body.getOrDefault("content", ""),
            (String) body.getOrDefault("color", "default"));
    }

    public Map<String, Object> update(int id, Map<String, Object> body) { return repo.update(id, body); }

    public void delete(int id) { repo.delete(id); }
}
