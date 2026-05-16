package de.lecturebase.service;

import de.lecturebase.model.Project;
import de.lecturebase.storage.ProjectRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class ProjectService {

    private final ProjectRepository repo;

    public ProjectService(ProjectRepository repo) { this.repo = repo; }

    public List<Project> list() { return repo.findAll(); }

    public Project create(String name, String description, String color) {
        long id = repo.create(name, description, color);
        return repo.findById(id).orElseThrow();
    }

    public void update(long id, String name, String description, String color) {
        repo.update(id, name, description, color);
    }

    public void delete(long id) { repo.delete(id); }

    public String notes(long id) { return repo.findNotes(id); }

    public void saveNotes(long id, String content) { repo.saveNotes(id, content); }
}
