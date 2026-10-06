package com.example.ntbd.auth;

import io.sentry.protocol.User;
import io.sentry.spring7.SentryUserProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Errors reported to Sentry name the signed-in user by our user id only (no email or name). */
@Component
public class SentryUser implements SentryUserProvider {

    @Override
    public User provideUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AppUser appUser)) return null;
        User user = new User();
        user.setId(String.valueOf(appUser.getUserId()));
        return user;
    }
}
