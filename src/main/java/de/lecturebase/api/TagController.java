package de.lecturebase.api;

import de.lecturebase.storage.TagRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TagController {

    private final TagRepository tagRepository;

    public TagController(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @GetMapping("/tags")
    public List<String> listTags() {
        return tagRepository.findAll();
    }

    @PostMapping("/documents/{id}/tags")
    public ResponseEntity<Void> addTags(@PathVariable Long id, @RequestBody List<String> tags) {
        for (String tag : tags) {
            long tagId = tagRepository.getOrCreate(tag.trim());
            tagRepository.assignToDocument(id, tagId);
        }
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/documents/{id}/tags/{tag}")
    public ResponseEntity<Void> removeTag(@PathVariable Long id, @PathVariable String tag) {
        tagRepository.removeFromDocument(id, tag);
        return ResponseEntity.ok().build();
    }
}
