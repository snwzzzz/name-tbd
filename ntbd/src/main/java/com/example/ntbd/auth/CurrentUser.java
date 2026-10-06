package com.example.ntbd.auth;

import com.example.ntbd.domain.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/** The user who sent the current request. */
@Component
public class CurrentUser {

    public Optional<User.UserId> id() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUser user) {
            return Optional.of(new User.UserId(user.getUserId()));
        }
        return Optional.empty();
    }

    /** @throws NotSignedInException when nobody is signed in */
    public User.UserId requireId() {
        return id().orElseThrow(NotSignedInException::new);
    }
}
