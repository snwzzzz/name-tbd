package com.example.ntbd.auth;

import com.example.ntbd.domain.User;
import com.example.ntbd.domain.WorkspaceRole;
import com.example.ntbd.service.AccountService;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Local development only: signs in as any email, without an identity provider. Exists only with
 * {@code app.security.dev-sign-in=true}, which only the test configuration sets (never packaged).
 * The account is made like a real sign-in's (personal workspace and all), from issuer {@link #ISSUER}.
 */
@Hidden
@ConditionalOnProperty(name = "app.security.dev-sign-in", havingValue = "true")
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/dev/sign-in")
public class DevSignInController {

    public static final String PATH = "/api/dev/sign-in";
    static final String ISSUER = "urn:ntbd:dev-sign-in";
    /** The sample data's workspace (V1_0_18): dev users own it, so the sample app stays usable. */
    static final long SAMPLE_WORKSPACE_ID = -1L;

    private final AccountService accountService;
    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

    public record DevSignInRequest(String email, String name) {}

    @PostMapping
    public ResponseEntity<Void> signIn(@RequestBody DevSignInRequest body,
                                       HttpServletRequest request, HttpServletResponse response) {
        String email = body.email() == null ? "" : body.email().trim();
        String name = body.name() == null || body.name().isBlank() ? null : body.name().trim();
        User user = accountService.signIn(new OidcProfile(ISSUER, email.toLowerCase(), email, true,
                null, null, name, null));
        accountService.joinWorkspaceIfPresent(user.getId(), SAMPLE_WORKSPACE_ID, WorkspaceRole.OWNER);

        Instant now = Instant.now();
        OidcIdToken idToken = OidcIdToken.withTokenValue("dev-sign-in")
                .issuer(ISSUER)
                .subject(email.toLowerCase())
                .claim("email", user.getEmail().value())
                .issuedAt(now)
                .expiresAt(now.plus(1, ChronoUnit.DAYS))
                .build();
        var authorities = List.of(new SimpleGrantedAuthority("OIDC_USER"));
        var principal = new AppUser(user.getId().id(), authorities, idToken, null);

        // Like a real sign-in: a new session id, then the signed-in user in the session
        if (request.getSession(false) != null) request.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new OAuth2AuthenticationToken(principal, authorities, "dev"));
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return ResponseEntity.noContent().build();
    }
}
