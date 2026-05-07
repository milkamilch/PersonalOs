package de.lecturebase.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/github")
public class GitHubController {

    private static final ParameterizedTypeReference<List<Object>> LIST_TYPE =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final String token;
    private final String username;
    private final RestTemplate rest = new RestTemplate();

    public GitHubController(
            @Value("${github.token:}")    String token,
            @Value("${github.username:}") String username) {
        this.token    = token;
        this.username = username;
    }

    private HttpHeaders headers() {
        HttpHeaders h = new HttpHeaders();
        h.set("Accept", "application/vnd.github+json");
        h.set("X-GitHub-Api-Version", "2022-11-28");
        if (!token.isBlank()) h.set("Authorization", "Bearer " + token);
        return h;
    }

    private <T> T get(String url, ParameterizedTypeReference<T> type) {
        return rest.exchange(url, HttpMethod.GET, new HttpEntity<>(headers()), type).getBody();
    }

    // ── Repos ─────────────────────────────────────────────────────────────────
    @GetMapping("/repos")
    public ResponseEntity<?> repos() {
        if (token.isBlank()) return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        String url = username.isBlank()
                ? "https://api.github.com/user/repos?sort=updated&per_page=30&affiliation=owner"
                : "https://api.github.com/users/" + username + "/repos?sort=updated&per_page=30";
        return ResponseEntity.ok(get(url, LIST_TYPE));
    }

    // ── Issues ────────────────────────────────────────────────────────────────
    @GetMapping("/issues")
    public ResponseEntity<?> issues(@RequestParam String repo) {
        if (token.isBlank()) return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        String url = "https://api.github.com/repos/" + repo + "/issues?state=open&per_page=50";
        return ResponseEntity.ok(get(url, LIST_TYPE));
    }

    // ── Open PRs across all repos ──────────────────────────────────────────────
    @GetMapping("/prs")
    public ResponseEntity<?> prs() {
        if (token.isBlank()) return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        // Search for open PRs authored by the user
        String q = username.isBlank() ? "is:pr is:open" : "is:pr is:open author:" + username;
        String url = "https://api.github.com/search/issues?q=" + q.replace(" ", "+") + "&sort=updated&per_page=30";
        try {
            Map<String, Object> result = get(url, MAP_TYPE);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Recent commit activity (events) ───────────────────────────────────────
    @GetMapping("/activity")
    public ResponseEntity<?> activity() {
        if (token.isBlank() || username.isBlank())
            return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        String url = "https://api.github.com/users/" + username + "/events?per_page=30";
        try {
            List<Object> events = get(url, LIST_TYPE);
            // Filter to only push/create events and limit to 20
            List<Object> filtered = events.stream()
                    .filter(e -> {
                        if (e instanceof Map<?,?> m) {
                            String type = (String) m.get("type");
                            return "PushEvent".equals(type) || "CreateEvent".equals(type) ||
                                   "PullRequestEvent".equals(type) || "IssuesEvent".equals(type);
                        }
                        return false;
                    })
                    .limit(20)
                    .toList();
            return ResponseEntity.ok(filtered);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Single repo details ────────────────────────────────────────────────────
    @GetMapping("/repos/{owner}/{repo}")
    public ResponseEntity<?> repoDetail(@PathVariable String owner, @PathVariable String repo) {
        if (token.isBlank()) return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        String url = "https://api.github.com/repos/" + owner + "/" + repo;
        return ResponseEntity.ok(get(url, MAP_TYPE));
    }

    // ── Recent commits for a repo ──────────────────────────────────────────────
    @GetMapping("/repos/{owner}/{repo}/commits")
    public ResponseEntity<?> commits(@PathVariable String owner, @PathVariable String repo) {
        if (token.isBlank()) return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/commits?per_page=10";
        return ResponseEntity.ok(get(url, LIST_TYPE));
    }
}
