package de.lecturebase.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.InetAddress;
import java.util.Map;

@RestController
@RequestMapping("/api/server")
public class ServerMonitorController {

    private final String host;

    public ServerMonitorController(@Value("${server.monitor.host:}") String host) {
        this.host = host;
    }

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        if (host.isBlank()) {
            return ResponseEntity.status(503).body(Map.of("error", "SERVER_HOST not configured"));
        }
        long start = System.currentTimeMillis();
        boolean reachable;
        try {
            reachable = InetAddress.getByName(host).isReachable(3000);
        } catch (Exception e) {
            reachable = false;
        }
        long elapsed = System.currentTimeMillis() - start;
        return ResponseEntity.ok(Map.of(
                "host", host,
                "reachable", reachable,
                "responseTimeMs", reachable ? elapsed : -1
        ));
    }
}
