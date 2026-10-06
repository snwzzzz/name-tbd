package com.example.ntbd.livedata.appkey;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

/** A request of an exported app, authenticated by its app key (not a person; phase 6 adds signed-in app users). */
public class AppKeyAuthentication extends AbstractAuthenticationToken {

    private final AppKeyService.AppKeyPrincipal principal;

    public AppKeyAuthentication(AppKeyService.AppKeyPrincipal principal) {
        super(List.of(new SimpleGrantedAuthority("APP_KEY")));
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return "";
    }

    @Override
    public AppKeyService.AppKeyPrincipal getPrincipal() {
        return principal;
    }
}
