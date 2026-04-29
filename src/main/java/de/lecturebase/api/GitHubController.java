package de.lecturebase.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/github")
public class GitHubController {

    private static final ParameterizedTypeReference<List<Object>> LIST_TYPE =
            new ParameterizedTypeReference<>() {};

    private final String token;
    private final String username;
    private final RestTemplate rest = new RestTemplate();

    public GitHubController(
            @Value("${github.token:}") String token,
            @Value("${github.username:}") String username) {
        this.token = token;
        this.username = username;
    }

    private HttpHeaders headers() {
        HttpHeaders h = new HttpHeaders();
        h.set("Accept", "application/vnd.github+json");
        h.set("X-GitHub-Api-Version", "2022-11-28");
        if (!token.isBlank()) h.set("Authorization", "Bearer " + token);
        return h;
    }

    @GetMapping("/repos")
    public ResponseEntity<?> repos() {
        if (token.isBlank()) return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        String url = username.isBlank()
                ? "https://api.github.com/user/repos?sort=updated&per_page=30"
                : "https://api.github.com/users/" + username + "/repos?sort=updated&per_page=30";
        ResponseEntity<List<Object>> r = rest.exchange(url, HttpMethod.GET, new HttpEntity<>(headers()), LIST_TYPE);
        return ResponseEntity.ok(r.getBody());
    }

    @GetMapping("/issues")
    public ResponseEntity<?> issues(@RequestParam String repo) {
        if (token.isBlank()) return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        String url = "https://api.github.com/repos/" + repo + "/issues?state=open&per_page=50";
        ResponseEntity<List<Object>> r = rest.exchange(url, HttpMethod.GET, new HttpEntity<>(headers()), LIST_TYPE);
        return ResponseEntity.ok(r.getBody());
    }
}
