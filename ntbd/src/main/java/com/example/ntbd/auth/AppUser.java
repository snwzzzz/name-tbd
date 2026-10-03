package com.example.ntbd.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

import java.io.Serial;
import java.util.Collection;

/** The signed-in principal: the identity provider's user plus our user id, kept in the session. */
public class AppUser extends DefaultOidcUser {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Long userId;

    public AppUser(Long userId, Collection<? extends GrantedAuthority> authorities,
                   OidcIdToken idToken, OidcUserInfo userInfo) {
        super(authorities, idToken, userInfo);
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }
}
