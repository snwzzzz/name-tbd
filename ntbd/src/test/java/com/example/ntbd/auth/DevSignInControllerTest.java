package com.example.ntbd.auth;

import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class DevSignInControllerTest {

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    class When_enabled {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void signs_in_as_the_given_email_with_a_personal_workspace() throws Exception {
            var result = mockMvc.perform(post(DevSignInController.PATH).with(csrf())
                            .contentType("application/json")
                            .content("{\"email\":\"Dev.User@Example.com\",\"name\":\"Dev User\"}"))
                    .andExpect(status().isNoContent())
                    .andReturn();
            // Spring Session keeps the session in the database; the browser only has its cookie
            var sessionCookie = result.getResponse().getCookie("SESSION");

            mockMvc.perform(get("/api/me").cookie(sessionCookie))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.user.email").value("dev.user@example.com"))
                    .andExpect(jsonPath("$.user.firstName").value("Dev User"))
                    .andExpect(jsonPath("$.workspaces[0].personal").value(true));
        }

        @Test
        void rejects_an_invalid_email() throws Exception {
            mockMvc.perform(post(DevSignInController.PATH).with(csrf())
                            .contentType("application/json")
                            .content("{\"email\":\"not-an-email\"}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @SpringBootTest(properties = "app.security.dev-sign-in=false")
    @AutoConfigureMockMvc
    class When_disabled {

        @Autowired
        private MockMvc mockMvc;

        @Test
        void does_not_exist() throws Exception {
            mockMvc.perform(post(DevSignInController.PATH).with(csrf())
                            .contentType("application/json")
                            .content("{\"email\":\"dev@example.com\"}"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
