package de.lecturebase.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class GitHubService {

    private static final ParameterizedTypeReference<List<Object>> LIST_TYPE =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE =
            new ParameterizedTypeReference<>() {};

    private final String token;
    private final String username;
    private final RestTemplate rest = new RestTemplate();

    public GitHubService(
            @Value("${github.token:}")    String token,
            @Value("${github.username:}") String username) {
        this.token    = token;
        this.username = username;
    }

    public boolean isConfigured() {
        return !token.isBlank();
    }

    public boolean isFullyConfigured() {
        return !token.isBlank() && !username.isBlank();
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

    public List<Object> getRepos() {
        String url = username.isBlank()
                ? "https://api.github.com/user/repos?sort=updated&per_page=30&affiliation=owner"
                : "https://api.github.com/users/" + username + "/repos?sort=updated&per_page=30";
        return get(url, LIST_TYPE);
    }

    public List<Object> getIssues(String repo) {
        String url = "https://api.github.com/repos/" + repo + "/issues?state=open&per_page=50";
        return get(url, LIST_TYPE);
    }

    public Map<String, Object> getPrs() {
        String q = username.isBlank() ? "is:pr is:open" : "is:pr is:open author:" + username;
        String url = "https://api.github.com/search/issues?q=" + q.replace(" ", "+") + "&sort=updated&per_page=30";
        return get(url, MAP_TYPE);
    }

    public List<Object> getActivity() {
        String url = "https://api.github.com/users/" + username + "/events?per_page=30";
        List<Object> events = get(url, LIST_TYPE);
        return events.stream()
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
    }

    public Map<String, Object> getRepoDetail(String owner, String repo) {
        String url = "https://api.github.com/repos/" + owner + "/" + repo;
        return get(url, MAP_TYPE);
    }

    public List<Object> getCommits(String owner, String repo) {
        String url = "https://api.github.com/repos/" + owner + "/" + repo + "/commits?per_page=10";
        return get(url, LIST_TYPE);
    }
}
