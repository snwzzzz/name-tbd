package com.example.ntbd.config;

import com.example.ntbd.auth.AppUser;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Turns away requests that ask too much ({@link LimitsProperties}):
 * <ul>
 *   <li>bodies over the size limit: 413; a body without a declared length: 411 (so it can't run past the limit);</li>
 *   <li>more sign-ins, changes or workflow runs per minute than allowed: 429 with {@code Retry-After}.</li>
 * </ul>
 * Rates are counted per signed-in user, or per IP address without one (behind the deploy's proxy, the
 * client's address from X-Forwarded-For). Counts live in memory: with several backend instances,
 * each counts on its own.
 */
public class RequestLimitsFilter extends OncePerRequestFilter {

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final Pattern WORKFLOW_RUN = Pattern.compile("^/api/workflows/[^/]+/(execute|run)$");

    private final LimitsProperties limits;
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(10))
            .maximumSize(100_000)
            .build();

    public RequestLimitsFilter(LimitsProperties limits) {
        this.limits = limits;
    }

    private enum Rule { SIGN_IN, WORKFLOW_RUN, WRITE }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());

        if (path.startsWith("/api/") && WRITE_METHODS.contains(request.getMethod()) && !sizeAllowed(request, response, path)) {
            return;
        }

        Rule rule = ruleFor(request.getMethod(), path);
        if (rule != null) {
            ConsumptionProbe probe = bucket(rule, request).tryConsumeAndReturnRemaining(1);
            if (!probe.isConsumed()) {
                long seconds = Math.max(1, Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds() + 1);
                response.setHeader("Retry-After", String.valueOf(seconds));
                reject(response, HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Try again in " + seconds + " seconds.");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean sizeAllowed(HttpServletRequest request, HttpServletResponse response, String path) throws IOException {
        long length = request.getContentLengthLong();
        if (length < 0 && request.getHeader("Transfer-Encoding") != null) {
            reject(response, HttpStatus.LENGTH_REQUIRED, "The request body needs a Content-Length.");
            return false;
        }
        long max = path.equals("/api/data-sources") ? limits.maxDataSourceBytes() : limits.maxRequestBytes();
        if (length > max) {
            reject(response, HttpStatus.CONTENT_TOO_LARGE,
                    "The request is too large (at most " + (max / 1024) + " KB).");
            return false;
        }
        return true;
    }

    private static Rule ruleFor(String method, String path) {
        if (path.startsWith("/oauth2/") || path.startsWith("/login/") || path.equals("/api/dev/sign-in")) return Rule.SIGN_IN;
        if (!WRITE_METHODS.contains(method) || !path.startsWith("/api/")) return null;
        return WORKFLOW_RUN.matcher(path).matches() ? Rule.WORKFLOW_RUN : Rule.WRITE;
    }

    private Bucket bucket(Rule rule, HttpServletRequest request) {
        String client = rule == Rule.SIGN_IN ? "ip:" + request.getRemoteAddr() : clientOf(request);
        return buckets.get(rule + "|" + client, key -> {
            int perMinute = switch (rule) {
                case SIGN_IN -> limits.signInPerMinute();
                case WORKFLOW_RUN -> limits.executionsPerMinute();
                case WRITE -> limits.writesPerMinute();
            };
            return Bucket.builder()
                    .addLimit(Bandwidth.builder().capacity(perMinute).refillGreedy(perMinute, Duration.ofMinutes(1)).build())
                    .build();
        });
    }

    private static String clientOf(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUser user) {
            return "user:" + user.getUserId();
        }
        return "ip:" + request.getRemoteAddr();
    }

    private static void reject(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"" + message + "\",\"status\":" + status.value() + "}");
    }
}
