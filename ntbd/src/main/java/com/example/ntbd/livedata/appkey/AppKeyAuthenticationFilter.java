package com.example.ntbd.livedata.appkey;

import com.example.ntbd.config.LimitsProperties;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;

/**
 * Authenticates exported apps' data API requests by their app key ({@code Authorization: Bearer ntbd_ak_...}),
 * and limits them: request bodies to {@code app.limits.max-request-bytes}, requests to
 * {@code app.data.requests-per-minute} per key (429 with Retry-After). An unknown or revoked key is a 401.
 */
public class AppKeyAuthenticationFilter extends OncePerRequestFilter {

    private final AppKeyService keys;
    private final LimitsProperties limits;
    private final int perMinute;
    private final Cache<Long, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(10))
            .maximumSize(100_000)
            .build();

    public AppKeyAuthenticationFilter(AppKeyService keys, LimitsProperties limits, int perMinute) {
        this.keys = keys;
        this.limits = limits;
        this.perMinute = perMinute;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if ("OPTIONS".equals(request.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        String header = request.getHeader("Authorization");
        String key = header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : null;
        Optional<AppKeyService.AppKeyPrincipal> principal = keys.authenticate(key);
        if (principal.isEmpty()) {
            reject(response, HttpStatus.UNAUTHORIZED, "This app's key is unknown or was revoked.");
            return;
        }
        if (request.getContentLengthLong() > limits.maxRequestBytes()) {
            reject(response, HttpStatus.CONTENT_TOO_LARGE, "The request is too large.");
            return;
        }
        Bucket bucket = buckets.get(principal.get().keyId(), id -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(perMinute).refillGreedy(perMinute, Duration.ofMinutes(1)).build())
                .build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long seconds = Math.max(1, Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds() + 1);
            response.setHeader("Retry-After", String.valueOf(seconds));
            reject(response, HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Try again in " + seconds + " seconds.");
            return;
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new AppKeyAuthentication(principal.get()));
        SecurityContextHolder.setContext(context);
        try {
            chain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private static void reject(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"" + message + "\",\"status\":" + status.value() + "}");
    }
}
