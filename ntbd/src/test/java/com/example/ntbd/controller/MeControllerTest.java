package com.example.ntbd.controller;

import com.example.ntbd.auth.AppUser;
import com.example.ntbd.auth.CurrentUser;
import com.example.ntbd.config.SecurityConfig;
import com.example.ntbd.domain.User;
import com.example.ntbd.dto.MeDto;
import com.example.ntbd.dto.UserDto;
import com.example.ntbd.service.AccountService;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MeController.class)
@Import({SecurityConfig.class, CurrentUser.class})
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class MeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accountService;

    @Test
    void returns_the_signed_in_user_and_their_workspaces() throws Exception {
        var idToken = OidcIdToken.withTokenValue("token").subject("g-1").issuer("https://accounts.google.com").build();
        var principal = new AppUser(5L, List.of(), idToken, null);
        when(accountService.me(new User.UserId(5L))).thenReturn(new MeDto(
                new UserDto(5L, null, "ada@example.com", "Ada", "Lovelace", null),
                List.of(new MeDto.WorkspaceMembershipDto(3L, "Personal", true, "OWNER"))));

        mockMvc.perform(get("/api/me").with(oidcLogin().oidcUser(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("ada@example.com"))
                .andExpect(jsonPath("$.workspaces[0].id").value(3))
                .andExpect(jsonPath("$.workspaces[0].role").value("OWNER"));
    }

    @Test
    void returns_401_when_nobody_is_signed_in() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }
}
