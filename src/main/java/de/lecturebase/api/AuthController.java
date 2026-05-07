package de.lecturebase.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Value("${app.api.key:}")
    private String apiKey;

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(@RequestBody Map<String, String> body) {
        String key = body.getOrDefault("key", "");

        if (apiKey == null || apiKey.isBlank()) {
            // Dev mode: any key works
            return ResponseEntity.ok(Map.of("ok", true));
        }

        if (apiKey.equals(key)) {
            return ResponseEntity.ok(Map.of("ok", true));
        }

        return ResponseEntity.status(401).body(Map.of("ok", false, "error", "Falsches Passwort"));
    }
}
