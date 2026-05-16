package de.lecturebase.service;

import de.lecturebase.repository.ContactsRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class ContactsService {

    private final ContactsRepository repo;

    public ContactsService(ContactsRepository repo) { this.repo = repo; }

    public List<Map<String, Object>> list(String q) {
        if (q != null && !q.isBlank()) return repo.search(q);
        return repo.findAll();
    }

    public Map<String, Object> create(Map<String, Object> body) { return repo.create(body); }

    public Map<String, Object> update(long id, Map<String, Object> body) { return repo.update(id, body); }

    public void delete(long id) { repo.delete(id); }
}
