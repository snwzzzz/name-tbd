package com.example.ntbd.service;

import com.example.ntbd.auth.OidcProfile;
import com.example.ntbd.auth.SignInRejectedException;
import com.example.ntbd.domain.User;
import com.example.ntbd.domain.WorkspaceRole;
import com.example.ntbd.persistence.UserIdentityRepository;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.WorkspaceMemberRepository;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import(AccountService.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class AccountServiceTest {

    private static final String GOOGLE = "https://accounts.google.com";
    private static final String MICROSOFT = "https://login.microsoftonline.com/tenant-1/v2.0";

    @Autowired private AccountService accountService;
    @Autowired private UserRepository userRepository;
    @Autowired private UserIdentityRepository identityRepository;
    @Autowired private WorkspaceMemberRepository memberRepository;

    private static OidcProfile profile(String issuer, String subject, String email, boolean verified) {
        return new OidcProfile(issuer, subject, email, verified, "Ada", "Lovelace", "Ada Lovelace", "https://pic/1");
    }

    @Test
    void first_sign_in_creates_user_with_personal_workspace_as_owner() {
        User user = accountService.signIn(profile(GOOGLE, "g-1", "Ada@Example.com", true));

        assertThat(user.getEmail().value()).isEqualTo("ada@example.com");
        assertThat(user.getFirstName()).isEqualTo("Ada");
        assertThat(user.getLastName()).isEqualTo("Lovelace");
        assertThat(user.getAvatarUrl()).isEqualTo("https://pic/1");
        assertThat(identityRepository.findByIssuerAndSubject(GOOGLE, "g-1")).isPresent();

        var memberships = memberRepository.findByUserWithWorkspace(user.getId());
        assertThat(memberships).hasSize(1);
        assertThat(memberships.getFirst().getRole()).isEqualTo(WorkspaceRole.OWNER);
        assertThat(memberships.getFirst().getWorkspace().isPersonal()).isTrue();
    }

    @Test
    void signing_in_again_returns_the_same_user_and_refreshes_the_profile() {
        User first = accountService.signIn(profile(GOOGLE, "g-1", "ada@example.com", true));
        long users = userRepository.count();

        User again = accountService.signIn(new OidcProfile(GOOGLE, "g-1", "ada@example.com", true,
                "Augusta", "King", null, "https://pic/2"));

        assertThat(again.getId()).isEqualTo(first.getId());
        assertThat(again.getFirstName()).isEqualTo("Augusta");
        assertThat(again.getAvatarUrl()).isEqualTo("https://pic/2");
        assertThat(userRepository.count()).isEqualTo(users);
        assertThat(memberRepository.findByUserWithWorkspace(first.getId())).hasSize(1);
    }

    @Test
    void a_new_identity_with_a_verified_email_joins_the_existing_user() {
        User viaMicrosoft = accountService.signIn(profile(MICROSOFT, "m-1", "ada@example.com", false));

        User viaGoogle = accountService.signIn(profile(GOOGLE, "g-1", "ada@example.com", true));

        assertThat(viaGoogle.getId()).isEqualTo(viaMicrosoft.getId());
        assertThat(memberRepository.findByUserWithWorkspace(viaGoogle.getId())).hasSize(1);
    }

    @Test
    void a_new_identity_with_an_unverified_email_of_an_existing_user_is_rejected() {
        accountService.signIn(profile(GOOGLE, "g-1", "ada@example.com", true));

        assertThatThrownBy(() -> accountService.signIn(profile(MICROSOFT, "m-1", "ada@example.com", false)))
                .isInstanceOf(SignInRejectedException.class)
                .extracting(e -> ((SignInRejectedException) e).code())
                .isEqualTo("email_in_use");
        assertThat(identityRepository.findByIssuerAndSubject(MICROSOFT, "m-1")).isEmpty();
    }

    @Test
    void a_sign_in_without_email_is_rejected() {
        assertThatThrownBy(() -> accountService.signIn(profile(MICROSOFT, "m-1", null, false)))
                .isInstanceOf(SignInRejectedException.class)
                .extracting(e -> ((SignInRejectedException) e).code())
                .isEqualTo("email_missing");
    }

    @Test
    void without_a_given_name_the_full_name_or_email_becomes_the_first_name() {
        User named = accountService.signIn(new OidcProfile(MICROSOFT, "m-1", "grace@example.com", false,
                null, null, "Grace Hopper", null));
        User unnamed = accountService.signIn(new OidcProfile(MICROSOFT, "m-2", "alan@example.com", false,
                null, null, null, null));

        assertThat(named.getFirstName()).isEqualTo("Grace Hopper");
        assertThat(named.getLastName()).isEmpty();
        assertThat(unnamed.getFirstName()).isEqualTo("alan");
    }

    @Test
    void me_lists_the_users_workspaces() {
        User user = accountService.signIn(profile(GOOGLE, "g-1", "ada@example.com", true));

        var me = accountService.me(user.getId());

        assertThat(me.user().email()).isEqualTo("ada@example.com");
        assertThat(me.workspaces()).singleElement().satisfies(w -> {
            assertThat(w.personal()).isTrue();
            assertThat(w.role()).isEqualTo("OWNER");
        });
    }
}
