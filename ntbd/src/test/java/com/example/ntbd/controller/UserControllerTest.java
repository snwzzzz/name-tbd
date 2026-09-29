package com.example.ntbd.controller;

import com.example.ntbd.Exception.DuplicateResourceException;
import com.example.ntbd.commands.NewUserCommand;
import com.example.ntbd.dto.UserDto;
import com.example.ntbd.service.UserService;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserService userService;

    @Test
    void create_user_returns_201() throws Exception {
        var command = new NewUserCommand("jdoe", "jdoe@example.com", "Password123!", "John", "Doe");
        var dto = new UserDto(1L, "jdoe", "jdoe@example.com", null, "John", "Doe");

        when(userService.createUser(any())).thenReturn(dto);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(command)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("jdoe"));
    }

    @Test
    void create_user_returns_409_on_conflict() throws Exception {
        var command = new NewUserCommand("jdoe", "jdoe@example.com", "Password123!", "John", "Doe");

        when(userService.createUser(any())).thenThrow(new DuplicateResourceException("Username already taken"));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(command)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("already taken")));
    }

    @Test
    void create_user_returns_400_on_bad_password() throws Exception {
        var command = new NewUserCommand("jdoe", "jdoe@example.com", "weak", "John", "Doe");

        when(userService.createUser(any())).thenThrow(new com.example.ntbd.Exception.PasswordValidationException(java.util.List.of("Password too weak")));

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(command)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Password too weak")));
    }
}
