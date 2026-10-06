package com.example.ntbd.auth;

/**
 * Who signed in, as the identity provider describes them. {@code issuer} plus {@code subject}
 * identify the person; everything else is profile data that may be missing.
 */
public record OidcProfile(
        String issuer,
        String subject,
        String email,
        boolean emailVerified,
        String givenName,
        String familyName,
        String fullName,
        String pictureUrl
) {
}
