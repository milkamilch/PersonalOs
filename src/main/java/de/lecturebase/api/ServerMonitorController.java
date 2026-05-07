package de.lecturebase.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jcraft.jsch.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.*;
import java.net.InetAddress;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

@RestController
@RequestMapping("/api/server")
public class ServerMonitorController {

    private final String host;
    private final String sshUser;
    private final String sshPass;
    private final ObjectMapper mapper = new ObjectMapper();

    // 30-second result cache to avoid hammering SSH
    private final AtomicReference<CachedMetrics> cache = new AtomicReference<>();

    private record CachedMetrics(Map<String, Object> data, Instant at) {
        boolean fresh() { return Instant.now().minusSeconds(30).isBefore(at); }
    }

    public ServerMonitorController(
            @Value("${server.monitor.host:}")     String host,
            @Value("${server.monitor.ssh.user:root}") String sshUser,
            @Value("${server.monitor.ssh.pass:}")  String sshPass) {
        this.host    = host;
        this.sshUser = sshUser;
        this.sshPass = sshPass;
    }

    // ── Ping / basic status ──────────────────────────────────────────────────
    @GetMapping("/status")
    public ResponseEntity<?> status() {
        if (host.isBlank())
            return ResponseEntity.status(503).body(Map.of("error", "SERVER_HOST not configured"));
        long start = System.currentTimeMillis();
        boolean reachable;
        try { reachable = InetAddress.getByName(host).isReachable(3000); }
        catch (Exception e) { reachable = false; }
        return ResponseEntity.ok(Map.of(
                "host", host,
                "reachable", reachable,
                "responseTimeMs", reachable ? System.currentTimeMillis() - start : -1
        ));
    }

    // ── Full SSH metrics ──────────────────────────────────────────────────────
    @GetMapping("/metrics")
    public ResponseEntity<?> metrics() {
        if (host.isBlank() || sshPass.isBlank())
            return ResponseEntity.status(503).body(Map.of("error", "SERVER_HOST or SERVER_SSH_PASS not configured"));

        CachedMetrics cached = cache.get();
        if (cached != null && cached.fresh()) return ResponseEntity.ok(cached.data());

        try {
            Map<String, Object> data = fetchViaSSH();
            cache.set(new CachedMetrics(data, Instant.now()));
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }

    // ── Docker containers ─────────────────────────────────────────────────────
    @GetMapping("/containers")
    public ResponseEntity<?> containers() {
        if (host.isBlank() || sshPass.isBlank())
            return ResponseEntity.status(503).body(Map.of("error", "Not configured"));
        try {
            String out = exec("docker ps -a --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}'");
            List<Map<String, String>> containers = new ArrayList<>();
            for (String line : out.split("\n")) {
                String[] p = line.split("\\|", -1);
                if (p.length >= 4) {
                    Map<String, String> c = new LinkedHashMap<>();
                    c.put("name",   p[0].trim());
                    c.put("image",  shortenImage(p[1].trim()));
                    c.put("status", p[2].trim());
                    c.put("state",  p[3].trim());
                    c.put("ports",  p.length > 4 ? p[4].trim() : "");
                    containers.add(c);
                }
            }
            return ResponseEntity.ok(containers);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }

    // ── Container action (start/stop/restart) ────────────────────────────────
    @PostMapping("/containers/{name}/{action}")
    public ResponseEntity<?> containerAction(@PathVariable String name, @PathVariable String action) {
        if (!Set.of("start", "stop", "restart").contains(action))
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid action"));
        try {
            String out = exec("docker " + action + " " + name + " 2>&1");
            // Invalidate cache
            cache.set(null);
            return ResponseEntity.ok(Map.of("result", out.trim()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }

    // ── Logs ─────────────────────────────────────────────────────────────────
    @GetMapping("/containers/{name}/logs")
    public ResponseEntity<?> containerLogs(@PathVariable String name,
                                           @RequestParam(defaultValue = "50") int lines) {
        try {
            String out = exec("docker logs --tail=" + lines + " " + name + " 2>&1");
            return ResponseEntity.ok(Map.of("logs", out));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e)));
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private Map<String, Object> fetchViaSSH() throws Exception {
        // Single session, run all commands
        String script = """
            echo "=LOAD=" && cat /proc/loadavg
            echo "=MEM="  && cat /proc/meminfo | grep -E 'MemTotal|MemAvailable'
            echo "=DISK="  && df -B1 / | tail -1
            echo "=UP="   && cat /proc/uptime
            echo "=DOCKER=" && docker ps --format '{{.Names}}|{{.State}}|{{.Status}}' 2>/dev/null
            echo "=CPUS="  && nproc
        """;
        String raw = exec(script);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("host", host);

        // Parse sections
        Map<String, String> sections = parseSections(raw);

        // Load average
        String load = sections.getOrDefault("LOAD", "0 0 0");
        String[] loadParts = load.trim().split("\\s+");
        result.put("loadAvg1",  parseDouble(safe(loadParts, 0)));
        result.put("loadAvg5",  parseDouble(safe(loadParts, 1)));
        result.put("loadAvg15", parseDouble(safe(loadParts, 2)));
        result.put("cpuCores",  parseInt(sections.getOrDefault("CPUS", "1")));

        // Memory
        String mem = sections.getOrDefault("MEM", "");
        long memTotal = parseMemKb(mem, "MemTotal") * 1024;
        long memAvail = parseMemKb(mem, "MemAvailable") * 1024;
        long memUsed  = memTotal - memAvail;
        result.put("memTotal", memTotal);
        result.put("memUsed",  memUsed);
        result.put("memPct",   memTotal > 0 ? (double) memUsed / memTotal * 100 : 0);

        // Disk
        String disk = sections.getOrDefault("DISK", "");
        String[] diskParts = disk.trim().split("\\s+");
        long diskTotal = parseLong(safe(diskParts, 1));
        long diskUsed  = parseLong(safe(diskParts, 2));
        result.put("diskTotal", diskTotal);
        result.put("diskUsed",  diskUsed);
        result.put("diskPct",   diskTotal > 0 ? (double) diskUsed / diskTotal * 100 : 0);

        // Uptime
        String up = sections.getOrDefault("UP", "0").trim().split("\\s+")[0];
        result.put("uptimeSeconds", (long) Double.parseDouble(up));

        // Docker containers
        String docker = sections.getOrDefault("DOCKER", "");
        List<Map<String, String>> containers = new ArrayList<>();
        for (String line : docker.split("\n")) {
            line = line.trim();
            if (line.isBlank()) continue;
            String[] p = line.split("\\|", -1);
            if (p.length >= 2) {
                Map<String, String> c = new LinkedHashMap<>();
                c.put("name",   p[0].trim());
                c.put("state",  p.length > 1 ? p[1].trim() : "");
                c.put("status", p.length > 2 ? p[2].trim() : "");
                containers.add(c);
            }
        }
        result.put("containers", containers);
        result.put("reachable", true);

        return result;
    }

    private String exec(String cmd) throws Exception {
        JSch jsch = new JSch();
        jsch.setIdentityRepository(null); // do not try SSH keys from ~/.ssh
        Session session = jsch.getSession(sshUser, host, 22);
        session.setPassword(sshPass);
        session.setUserInfo(new UserInfo() {
            public String getPassword()              { return sshPass; }
            public boolean promptPassword(String m)  { return true; }
            public String getPassphrase()            { return null; }
            public boolean promptPassphrase(String m){ return false; }
            public boolean promptYesNo(String m)     { return true; }
            public void showMessage(String m)        {}
        });
        Properties config = new Properties();
        config.put("StrictHostKeyChecking", "no");
        config.put("PreferredAuthentications", "keyboard-interactive,password");
        session.setConfig(config);
        session.connect(8000);
        try {
            ChannelExec channel = (ChannelExec) session.openChannel("exec");
            channel.setCommand(cmd);
            channel.setInputStream(null);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            channel.setOutputStream(out);
            channel.connect(5000);
            while (!channel.isClosed()) Thread.sleep(50);
            channel.disconnect();
            return out.toString();
        } finally {
            session.disconnect();
        }
    }

    private Map<String, String> parseSections(String raw) {
        Map<String, String> result = new LinkedHashMap<>();
        String currentKey = null;
        StringBuilder currentVal = new StringBuilder();
        for (String line : raw.split("\n")) {
            if (line.startsWith("=") && line.endsWith("=") && line.length() > 2) {
                if (currentKey != null) result.put(currentKey, currentVal.toString().trim());
                currentKey = line.substring(1, line.length() - 1);
                currentVal = new StringBuilder();
            } else if (currentKey != null) {
                currentVal.append(line).append("\n");
            }
        }
        if (currentKey != null) result.put(currentKey, currentVal.toString().trim());
        return result;
    }

    private long parseMemKb(String meminfo, String key) {
        for (String line : meminfo.split("\n")) {
            if (line.startsWith(key + ":")) {
                String[] p = line.trim().split("\\s+");
                return p.length > 1 ? parseLong(p[1]) : 0;
            }
        }
        return 0;
    }

    private String safe(String[] arr, int i)  { return i < arr.length ? arr[i] : "0"; }
    private long   parseLong(String s)        { try { return Long.parseLong(s.replaceAll("[^0-9]", "")); } catch (Exception e) { return 0; } }
    private int    parseInt(String s)         { try { return Integer.parseInt(s.trim()); } catch (Exception e) { return 1; } }
    private double parseDouble(String s)      { try { return Double.parseDouble(s.trim()); } catch (Exception e) { return 0.0; } }

    private String shortenImage(String image) {
        if (image.contains("ghcr.io/")) image = image.substring(image.lastIndexOf('/') + 1);
        if (image.contains(":")) image = image.substring(0, image.lastIndexOf(':') + 1) + image.substring(image.lastIndexOf(':') + 1);
        return image;
    }
}
