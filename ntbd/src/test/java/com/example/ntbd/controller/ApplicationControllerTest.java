package com.example.ntbd.controller;

import com.example.ntbd.commands.NewApplicationCommand;
import com.example.ntbd.dto.ApplicationDto;
import com.example.ntbd.service.ApplicationService;
import com.example.ntbd.config.SecurityConfig;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApplicationController.class)
@Import(SecurityConfig.class)
@WithMockUser
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class ApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ApplicationService applicationService;

    @Test
    void create_application_returns_201() throws Exception {
        var command = new NewApplicationCommand(1L, "App 1", "Desc");
        var dto = new ApplicationDto(1L, 1L, "App 1", "Desc");

        when(applicationService.createApplication(any())).thenReturn(dto);

        mockMvc.perform(post("/api/applications").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(command)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.title").value("App 1"));
    }

    @Test
    void get_applications_returns_200() throws Exception {
        var dtos = List.of(new ApplicationDto(1L, 1L, "App 1", "Desc"));
        when(applicationService.findAll()).thenReturn(dtos);

        mockMvc.perform(get("/api/applications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("App 1"));
    }
}
