package com.example.ntbd.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;

import java.util.List;

/** Signed-in users for tests: what a real sign-in puts in the session (an {@link AppUser}). */
public final class TestSignIn {

    private TestSignIn() {}

    public static AppUser principal(long userId) {
        OidcIdToken idToken = OidcIdToken.withTokenValue("test")
                .issuer("urn:ntbd:test")
                .subject("user-" + userId)
                .build();
        return new AppUser(userId, List.of(new SimpleGrantedAuthority("OIDC_USER")), idToken, null);
    }

    public static Authentication authentication(long userId) {
        AppUser principal = principal(userId);
        return new OAuth2AuthenticationToken(principal, principal.getAuthorities(), "test");
    }

    /** Signs in on the current thread (for tests that call controllers or services directly). */
    public static void signInAs(long userId) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication(userId));
        SecurityContextHolder.setContext(context);
    }

    public static void signOut() {
        SecurityContextHolder.clearContext();
    }
}
