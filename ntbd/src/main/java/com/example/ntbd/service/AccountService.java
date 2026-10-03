package com.example.ntbd.service;

import com.example.ntbd.Exception.UserNotFoundException;
import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.SignInRejectedException;
import com.example.ntbd.domain.*;
import com.example.ntbd.dto.MeDto;
import com.example.ntbd.mapper.UserMapper;
import com.example.ntbd.persistence.UserIdentityRepository;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.WorkspaceMemberRepository;
import com.example.ntbd.persistence.WorkspaceRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

/** Accounts of people who sign in with an identity provider. */
@RequiredArgsConstructor

@Service
public class AccountService {

    static final String PERSONAL_WORKSPACE_NAME = "Personal";

    private final UserRepository userRepository;
    private final UserIdentityRepository identityRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;

    /**
     * The account for this sign-in. A known identity signs in to its user (refreshing name and picture).
     * A new identity joins the user with the same email only if the provider verified that email;
     * otherwise it becomes a new user with a personal workspace.
     */
    @Transactional
    public User signIn(OidcProfile profile) {
        Optional<UserIdentity> known = identityRepository.findByIssuerAndSubject(profile.issuer(), profile.subject());
        if (known.isPresent()) {
            User user = known.get().getUser();
            applyProfile(user, profile);
            return user;
        }

        Email email = emailOf(profile);
        Optional<User> sameEmail = userRepository.findByEmail(email);
        if (sameEmail.isPresent() && !profile.emailVerified()) {
            // Linking on an unverified address would hand the account to anyone who can claim that address
            throw new SignInRejectedException("email_in_use",
                    "This email already belongs to an account. Sign in the way you did before.");
        }

        User user = sameEmail.orElseGet(() -> createUser(email, profile));
        identityRepository.save(UserIdentity.builder()
                .user(user)
                .issuer(profile.issuer())
                .subject(profile.subject())
                .build());
        return user;
    }

    @Transactional
    public MeDto me(User.UserId userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId.id()));
        var workspaces = memberRepository.findByUserWithWorkspace(userId).stream()
                .map(m -> new MeDto.WorkspaceMembershipDto(
                        m.getWorkspace().getId().id(),
                        m.getWorkspace().getName(),
                        m.getWorkspace().isPersonal(),
                        m.getRole().name()))
                .toList();
        return new MeDto(UserMapper.toDto(user), workspaces);
    }

    /** Makes the user a member of the workspace with {@code role}, if the workspace exists and they aren't one yet. */
    @Transactional
    public void joinWorkspaceIfPresent(User.UserId userId, Long workspaceId, WorkspaceRole role) {
        Optional<Workspace> workspace = workspaceRepository.findById(new Workspace.WorkspaceId(workspaceId));
        if (workspace.isEmpty() || memberRepository.existsByWorkspace_IdAndUser_Id(workspace.get().getId(), userId)) {
            return;
        }
        memberRepository.save(WorkspaceMember.builder()
                .workspace(workspace.get())
                .user(userRepository.getReferenceById(userId))
                .role(role)
                .build());
    }

    private User createUser(Email email, OidcProfile profile) {
        User user = User.builder().email(email).build();
        applyProfile(user, profile);
        user = userRepository.save(user);

        Workspace personal = workspaceRepository.save(Workspace.builder()
                .name(PERSONAL_WORKSPACE_NAME)
                .personal(true)
                .build());
        memberRepository.save(WorkspaceMember.builder()
                .workspace(personal)
                .user(user)
                .role(WorkspaceRole.OWNER)
                .build());
        return user;
    }

    private static Email emailOf(OidcProfile profile) {
        if (profile.email() == null || profile.email().isBlank()) {
            throw new SignInRejectedException("email_missing",
                    "Your identity provider didn't share an email address.");
        }
        try {
            return new Email(profile.email().trim().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new SignInRejectedException("email_invalid",
                    "Your identity provider shared an email address we can't use.");
        }
    }

    /**
     * Names and picture follow the identity provider. Without a given name, the full name (or else the
     * email's local part) becomes the first name and the last name stays empty.
     */
    private static void applyProfile(User user, OidcProfile profile) {
        if (notBlank(profile.givenName())) {
            user.setFirstName(profile.givenName());
            user.setLastName(notBlank(profile.familyName()) ? profile.familyName() : "");
        } else if (notBlank(profile.fullName())) {
            user.setFirstName(profile.fullName());
            user.setLastName("");
        } else if (user.getFirstName() == null) {
            user.setFirstName(localPart(user.getEmail().value()));
            user.setLastName("");
        }
        user.setAvatarUrl(profile.pictureUrl());
    }

    private static String localPart(String email) {
        return email.substring(0, email.indexOf('@'));
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
