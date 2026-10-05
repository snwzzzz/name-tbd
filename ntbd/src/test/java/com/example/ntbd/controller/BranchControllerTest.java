package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.commands.NewBranchCommand;
import com.example.ntbd.dto.BranchDto;
import com.example.ntbd.service.BranchService;
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

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BranchController.class)
@Import(SecurityConfig.class)
@WithMockUser
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class BranchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BranchService branchService;

    @MockitoBean
    private com.example.ntbd.service.VersionControlService versionControlService;

    @MockitoBean
    private WorkspaceAccess access;

    @MockitoBean
    private com.example.ntbd.service.ChangeBatchService changeBatchService;

    @Test
    void create_branch_returns_201() throws Exception {
        var command = new NewBranchCommand(1L, "main", "Main branch");
        var dto = new BranchDto(10L, "main", "Main branch", null, null, null, null, null);

        when(branchService.createBranch(any())).thenReturn(dto);

        mockMvc.perform(post("/api/branches").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(command)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("main"));
    }

    @Test
    void get_branches_by_application_returns_200() throws Exception {
        var dtos = List.of(new BranchDto(10L, "main", null, null, null, null, null, null));
        when(branchService.findByApplicationId(1L)).thenReturn(dtos);

        mockMvc.perform(get("/api/branches").param("applicationId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("main"));
    }

    @Test
    void delete_branch_returns_204() throws Exception {
        doNothing().when(branchService).deleteBranch(10L);

        mockMvc.perform(delete("/api/branches/10").with(csrf()))
                .andExpect(status().isNoContent());

        verify(branchService).deleteBranch(10L);
    }

    @Test
    void delete_branch_returns_404_when_not_found() throws Exception {
        doThrow(new BranchNotFoundException(99L)).when(branchService).deleteBranch(99L);

        mockMvc.perform(delete("/api/branches/99").with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value(containsString("99")));
    }
}
