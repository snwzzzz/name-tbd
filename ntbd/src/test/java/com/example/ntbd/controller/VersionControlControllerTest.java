package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.config.SecurityConfig;
import com.example.ntbd.domain.VersionKind;
import com.example.ntbd.dto.VersionDto;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.format.ExportFormat;
import com.example.ntbd.export.format.ExportFormatRegistry;
import com.example.ntbd.export.format.ExportedFile;
import com.example.ntbd.service.VersionControlService;
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

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VersionControlController.class)
@Import(SecurityConfig.class)
@WithMockUser
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class VersionControlControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private VersionControlService versionControlService;
    @MockitoBean private ExportFormatRegistry formats;
    @MockitoBean private WorkspaceAccess access;

    private static final VersionDto VERSION = new VersionDto(10L, 3, VersionKind.MANUAL, "Before launch", Instant.now(), "Ada", 1234);

    @Test
    void saves_a_version() throws Exception {
        when(versionControlService.save(1L, "Before launch")).thenReturn(VERSION);

        mockMvc.perform(post("/api/versions").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"branchId\":1,\"label\":\"Before launch\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.number").value(3))
                .andExpect(jsonPath("$.kind").value("MANUAL"));
    }

    @Test
    void lists_a_branchs_versions() throws Exception {
        when(versionControlService.list(1L)).thenReturn(List.of(VERSION));

        mockMvc.perform(get("/api/versions").param("branchId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].label").value("Before launch"))
                .andExpect(jsonPath("$[0].author").value("Ada"));
    }

    @Test
    void renames_and_restores_a_version() throws Exception {
        when(versionControlService.rename(10L, "New")).thenReturn(VERSION);
        when(versionControlService.restore(10L)).thenReturn(VERSION);

        mockMvc.perform(patch("/api/versions/10").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"label\":\"New\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/versions/10/restore").with(csrf()))
                .andExpect(status().isNoContent());
        verify(versionControlService).restore(10L);
    }

    @Test
    void answers_409_for_a_version_in_the_old_format() throws Exception {
        when(versionControlService.definition(10L)).thenThrow(new com.example.ntbd.Exception.VersionNotRestorableException(10L));

        mockMvc.perform(get("/api/versions/10/definition")).andExpect(status().isConflict());
    }

    @Test
    void previews_a_version_as_the_exported_app_in_a_sandbox() throws Exception {
        AppDefinition definition = new AppDefinition(new AppDefinition.App(1L, "Shop"));
        ExportFormat html = mock(ExportFormat.class);
        when(versionControlService.definition(10L)).thenReturn(definition);
        when(formats.get("html")).thenReturn(html);
        when(html.export(definition)).thenReturn(new ExportedFile("shop.html", MediaType.TEXT_HTML,
                "<html><script>run()</script></html>".getBytes(StandardCharsets.UTF_8)));

        mockMvc.perform(get("/api/versions/10/preview"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Security-Policy", VersionControlController.PREVIEW_CSP))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("inline")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("run()")));
    }

    @Test
    void every_other_api_answer_keeps_the_csp_that_allows_nothing() throws Exception {
        when(versionControlService.list(1L)).thenReturn(List.of());

        mockMvc.perform(get("/api/versions").param("branchId", "1"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"));
    }
}
