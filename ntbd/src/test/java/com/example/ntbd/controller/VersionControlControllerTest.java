package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewVersionControlCommand;
import com.example.ntbd.dto.VersionControlDto;
import com.example.ntbd.service.VersionControlService;
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
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VersionControlController.class)
@Import(SecurityConfig.class)
@WithMockUser
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class VersionControlControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private VersionControlService versionControlService;

    @MockitoBean
    private WorkspaceAccess access;

    @Test
    void create_version_returns_201() throws Exception {
        var command = new NewVersionControlCommand(1L, 2L, java.time.LocalDateTime.now(), "{}", "1.0.0");
        var dto = new VersionControlDto(10L, "1.0.0", null, java.time.LocalDateTime.now(), "{}", null);

        when(versionControlService.createVersion(any())).thenReturn(dto);

        mockMvc.perform(post("/api/versions").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(command)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.version").value("1.0.0"));
    }

    @Test
    void get_versions_by_branch_returns_200() throws Exception {
        var dtos = List.of(new VersionControlDto(10L, "1.0.0", null, java.time.LocalDateTime.now(), "{}", null));
        when(versionControlService.findByBranchId(1L)).thenReturn(dtos);

        mockMvc.perform(get("/api/versions").param("branchId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].version").value("1.0.0"));
    }

    @Test
    void get_latest_version_by_branch_returns_200_when_found() throws Exception {
        var dto = new VersionControlDto(10L, "1.0.0", null, java.time.LocalDateTime.now(), "{}", null);
        when(versionControlService.findLatestByBranchId(1L)).thenReturn(Optional.of(dto));

        mockMvc.perform(get("/api/versions/latest").param("branchId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.version").value("1.0.0"));
    }

    @Test
    void get_latest_version_by_branch_returns_404_when_not_found() throws Exception {
        when(versionControlService.findLatestByBranchId(1L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/versions/latest").param("branchId", "1"))
                .andExpect(status().isNotFound());
    }
}
