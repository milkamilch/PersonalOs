package de.lecturebase.api;

import de.lecturebase.service.ServerMonitorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/server")
public class ServerMonitorController {

    private final ServerMonitorService serverMonitorService;

    public ServerMonitorController(ServerMonitorService serverMonitorService) {
        this.serverMonitorService = serverMonitorService;
    }

    @GetMapping("/status")
    public ResponseEntity<?> status() {
        if (!serverMonitorService.isHostConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "SERVER_HOST not configured"));
        try {
            return ResponseEntity.ok(serverMonitorService.getStatus());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }

    @GetMapping("/metrics")
    public ResponseEntity<?> metrics() {
        if (!serverMonitorService.isSshConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "SERVER_HOST or SERVER_SSH_PASS not configured"));
        try {
            return ResponseEntity.ok(serverMonitorService.getMetrics());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }

    @GetMapping("/containers")
    public ResponseEntity<?> containers() {
        if (!serverMonitorService.isSshConfigured())
            return ResponseEntity.status(503).body(Map.of("error", "Not configured"));
        try {
            return ResponseEntity.ok(serverMonitorService.getContainers());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }

    @PostMapping("/containers/{name}/{action}")
    public ResponseEntity<?> containerAction(@PathVariable String name, @PathVariable String action) {
        if (!Set.of("start", "stop", "restart").contains(action))
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid action"));
        try {
            return ResponseEntity.ok(Map.of("result", serverMonitorService.containerAction(name, action)));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }

    @GetMapping("/containers/{name}/logs")
    public ResponseEntity<?> containerLogs(@PathVariable String name,
                                           @RequestParam(defaultValue = "50") int lines) {
        try {
            return ResponseEntity.ok(Map.of("logs", serverMonitorService.getContainerLogs(name, lines)));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }
}
