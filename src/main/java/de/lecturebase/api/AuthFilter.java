package de.lecturebase.api;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(1)
public class AuthFilter extends OncePerRequestFilter {

    @Value("${app.api.key:}")
    private String apiKey;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String path = req.getRequestURI();

        // Allow preflight and auth endpoint
        if ("OPTIONS".equalsIgnoreCase(req.getMethod()) || path.startsWith("/api/auth")) {
            chain.doFilter(req, res);
            return;
        }

        // Only guard API routes; static frontend is public
        if (!path.startsWith("/api/")) {
            chain.doFilter(req, res);
            return;
        }

        // If no key is configured, allow everything (dev mode)
        if (apiKey == null || apiKey.isBlank()) {
            chain.doFilter(req, res);
            return;
        }

        String header = req.getHeader("X-API-Key");
        if (apiKey.equals(header)) {
            chain.doFilter(req, res);
            return;
        }

        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"Unauthorized\"}");
    }
}
