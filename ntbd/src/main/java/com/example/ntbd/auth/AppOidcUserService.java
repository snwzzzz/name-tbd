package com.example.ntbd.auth;

import com.example.ntbd.domain.User;
import com.example.ntbd.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;

/** Signs the OIDC user in to their account (creating it on first sign-in) and puts our user id in the session. */
@RequiredArgsConstructor
@Component
public class AppOidcUserService extends OidcUserService {

    private final AccountService accountService;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);
        try {
            User user = accountService.signIn(profileOf(oidcUser));
            return new AppUser(user.getId().id(), oidcUser.getAuthorities(), oidcUser.getIdToken(), oidcUser.getUserInfo());
        } catch (SignInRejectedException e) {
            throw new OAuth2AuthenticationException(new OAuth2Error(e.code(), e.getMessage(), null), e.getMessage(), e);
        }
    }

    static OidcProfile profileOf(OidcUser user) {
        // Microsoft Entra often leaves out "email"; its sign-in name is usually the address
        String email = user.getEmail() != null ? user.getEmail() : user.getPreferredUsername();
        return new OidcProfile(
                user.getIssuer().toString(),
                user.getSubject(),
                email,
                Boolean.TRUE.equals(user.getEmailVerified()),
                user.getGivenName(),
                user.getFamilyName(),
                user.getFullName(),
                user.getPicture()
        );
    }
}
