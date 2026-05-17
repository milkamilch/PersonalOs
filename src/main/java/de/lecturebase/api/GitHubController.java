package de.lecturebase.api;

import de.lecturebase.service.GitHubService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/github")
public class GitHubController {

    private final GitHubService gitHubService;

    public GitHubController(GitHubService gitHubService) {
        this.gitHubService = gitHubService;
    }

    @GetMapping("/repos")
    public ResponseEntity<?> repos() {
        if (!gitHubService.isConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        return ResponseEntity.ok(gitHubService.getRepos());
    }

    @GetMapping("/issues")
    public ResponseEntity<?> issues(@RequestParam String repo) {
        if (!gitHubService.isConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        return ResponseEntity.ok(gitHubService.getIssues(repo));
    }

    @GetMapping("/prs")
    public ResponseEntity<?> prs() {
        if (!gitHubService.isConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        try {
            return ResponseEntity.ok(gitHubService.getPrs());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/activity")
    public ResponseEntity<?> activity() {
        if (!gitHubService.isFullyConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        try {
            return ResponseEntity.ok(gitHubService.getActivity());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/repos/{owner}/{repo}")
    public ResponseEntity<?> repoDetail(@PathVariable String owner, @PathVariable String repo) {
        if (!gitHubService.isConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        return ResponseEntity.ok(gitHubService.getRepoDetail(owner, repo));
    }

    @GetMapping("/repos/{owner}/{repo}/commits")
    public ResponseEntity<?> commits(@PathVariable String owner, @PathVariable String repo) {
        if (!gitHubService.isConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "GitHub not configured"));
        return ResponseEntity.ok(gitHubService.getCommits(owner, repo));
    }
}
