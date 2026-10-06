package com.example.ntbd.livedata.oauth;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.dto.ConnectionDto;
import com.example.ntbd.livedata.ConnectionService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.ObjectMapper;

import java.io.Serializable;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;

/**
 * Connects Google Sheets and Microsoft 365 by signing in there (OAuth authorization code flow):
 * <ol>
 *   <li>The editor sends the browser to {@code /start}; the backend remembers what to connect (in the session,
 *       under a random {@code state}) and sends the browser on to the provider.</li>
 *   <li>The provider sends it back to {@code /callback} with a code; the backend trades it for a refresh token,
 *       stores that encrypted as the connection's secret, and sends the browser back into the editor
 *       ({@code returnTo}, with {@code ?connected=<id>}, or {@code ?connectError=...}).</li>
 * </ol>
 */
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/connections/oauth/{provider}")
public class OAuthConnectController {

    private static final String SESSION_PREFIX = "oauth-connect:";
    private static final Duration MAX_AGE = Duration.ofMinutes(15);

    /** What a sign-in that's under way will connect. */
    record Pending(String provider, Long workspaceId, String name, Long connectionId, String returnTo, Instant started)
            implements Serializable {
    }

    private final OAuthProviders providers;
    private final AccessTokens tokens;
    private final ConnectionService connections;
    private final WorkspaceAccess access;
    private final ObjectMapper objectMapper;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.frontend-url}")
    private String frontendUrl;

    /**
     * Starts signing in. {@code branchId} + {@code name}: a new connection in that app's workspace;
     * {@code connectionId}: signs an existing connection in again.
     */
    @GetMapping("/start")
    public ResponseEntity<Void> start(@PathVariable String provider,
                                      @RequestParam(required = false) Long branchId,
                                      @RequestParam(required = false) String name,
                                      @RequestParam(required = false) Long connectionId,
                                      @RequestParam(required = false) String returnTo,
                                      HttpSession session) {
        Long workspaceId;
        if (connectionId != null) {
            access.requireConnection(connectionId, EDITOR);
            workspaceId = connections.workspaceIdOf(connectionId);
        } else {
            access.requireBranch(branchId, EDITOR);
            workspaceId = connections.workspaceOf(null, branchId);
        }
        OAuthProviders.Provider p = providers.get(provider);
        if (!p.configured()) throw new IllegalArgumentException("Sign-in with " + provider + " isn't configured on this server");
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        String state = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        session.setAttribute(SESSION_PREFIX + state, new Pending(provider, workspaceId,
                name == null || name.isBlank() ? defaultName(provider) : name.trim(), connectionId, safeReturn(returnTo), Instant.now()));

        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(p.authorizationUri())
                .queryParam("client_id", p.clientId())
                .queryParam("redirect_uri", redirectUri(provider))
                .queryParam("response_type", "code")
                .queryParam("scope", p.scopes())
                .queryParam("state", state);
        p.extraParams().forEach(uri::queryParam);
        return redirect(uri.encode().build().toUri());
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@PathVariable String provider,
                                         @RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state,
                                         @RequestParam(required = false) String error,
                                         HttpSession session) {
        Object stored = state == null ? null : session.getAttribute(SESSION_PREFIX + state);
        if (state != null) session.removeAttribute(SESSION_PREFIX + state);
        if (!(stored instanceof Pending pending) || !pending.provider().equals(provider)
                || pending.started().plus(MAX_AGE).isBefore(Instant.now())) {
            return backToEditor("/console", Map.of("connectError", "The sign-in expired or was not started here; try again"));
        }
        if (error != null || code == null) {
            return backToEditor(pending.returnTo(), Map.of("connectError", error != null ? error : "no_code"));
        }
        OAuthProviders.Provider p = providers.get(provider);
        try {
            Map<String, Object> answer = tokens.exchangeCode(p, code, redirectUri(provider));
            Object refreshToken = answer.get("refresh_token");
            if (!(refreshToken instanceof String token) || token.isBlank()) {
                return backToEditor(pending.returnTo(), Map.of("connectError", provider + " gave no lasting access; try again"));
            }
            Map<String, Object> settings = new LinkedHashMap<>();
            String account = accountOf(answer.get("id_token"));
            if (account != null) settings.put("account", account);
            Map<String, Object> secret = Map.of("refreshToken", token);
            ConnectionDto connection = pending.connectionId() != null
                    ? connections.reconnect(pending.connectionId(), settings, secret)
                    : connections.createSignedIn(pending.workspaceId(), pending.name(), p.connectionKind(), settings, secret);
            tokens.forget(connection.id());
            return backToEditor(pending.returnTo(), Map.of("connected", String.valueOf(connection.id())));
        } catch (RuntimeException e) {
            return backToEditor(pending.returnTo(), Map.of("connectError", e.getMessage() == null ? "sign_in_failed" : e.getMessage()));
        }
    }

    private String redirectUri(String provider) {
        return frontendUrl.replaceAll("/+$", "") + "/api/connections/oauth/" + provider + "/callback";
    }

    private ResponseEntity<Void> backToEditor(String path, Map<String, String> params) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(frontendUrl.replaceAll("/+$", "") + path);
        params.forEach(uri::queryParam);
        return redirect(uri.encode().build().toUri());
    }

    private static ResponseEntity<Void> redirect(URI uri) {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(uri);
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    /** Only paths in the editor, so a link can't send people elsewhere after signing in. */
    static String safeReturn(String returnTo) {
        if (returnTo == null || !returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.contains("\\")
                || returnTo.contains("://")) {
            return "/console";
        }
        return returnTo;
    }

    /** The account's email from the ID token (only to show which account is connected; not used to trust anything). */
    @SuppressWarnings("unchecked")
    private String accountOf(Object idToken) {
        if (!(idToken instanceof String jwt)) return null;
        String[] parts = jwt.split("\\.");
        if (parts.length < 2) return null;
        try {
            Map<String, Object> claims = objectMapper.readValue(new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8), Map.class);
            Object email = claims.getOrDefault("email", claims.get("preferred_username"));
            return email == null ? null : String.valueOf(email);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String defaultName(String provider) {
        return provider.equals("google") ? "Google Sheets" : "Microsoft 365";
    }
}
