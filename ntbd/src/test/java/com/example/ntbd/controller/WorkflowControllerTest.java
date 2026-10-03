package com.example.ntbd.controller;

import com.example.ntbd.Exception.WorkflowNotFoundException;
import com.example.ntbd.commands.NewWorkflowCommand;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.dto.WorkflowDto;
import com.example.ntbd.service.EdgeService;
import com.example.ntbd.service.NodeService;
import com.example.ntbd.service.WorkflowService;
import com.example.ntbd.workflow.FlowEngine;
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

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WorkflowController.class)
@Import(SecurityConfig.class)
@WithMockUser
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class WorkflowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private WorkflowService workflowService;

    @MockitoBean
    private NodeService nodeService;

    @MockitoBean
    private EdgeService edgeService;

    @MockitoBean
    private FlowEngine flowEngine;

    // ---- POST /api/workflows ----

    @Test
    void create_workflow_returns_201_with_body() throws Exception {
        var command = new NewWorkflowCommand(1L, "My Flow", WorkflowStatus.DRAFT);
        var dto = new WorkflowDto(10L, "My Flow", WorkflowStatus.DRAFT, null, null, 1L);

        when(workflowService.createWorkflow(any(NewWorkflowCommand.class))).thenReturn(dto);

        mockMvc.perform(post("/api/workflows").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(command)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("My Flow"))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    // ---- GET /api/workflows/{id} ----

    @Test
    void get_workflow_returns_200_with_body() throws Exception {
        var dto = new WorkflowDto(5L, "Flow", WorkflowStatus.ACTIVE, null, null, null);
        when(workflowService.findById(5L)).thenReturn(dto);

        mockMvc.perform(get("/api/workflows/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.name").value("Flow"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void get_workflow_returns_404_when_not_found() throws Exception {
        when(workflowService.findById(99L)).thenThrow(new WorkflowNotFoundException(99L));

        mockMvc.perform(get("/api/workflows/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value(containsString("99")));
    }

    // ---- GET /api/workflows?branchId=x ----

    @Test
    void get_workflows_by_branch_returns_200_with_list() throws Exception {
        var dtos = List.of(
                new WorkflowDto(1L, "W1", WorkflowStatus.DRAFT, null, null, 7L),
                new WorkflowDto(2L, "W2", WorkflowStatus.ACTIVE, null, null, 7L)
        );
        when(workflowService.findByBranchId(7L)).thenReturn(dtos);

        mockMvc.perform(get("/api/workflows").param("branchId", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("W1"))
                .andExpect(jsonPath("$[1].name").value("W2"));
    }

    // ---- DELETE /api/workflows/{id} ----

    @Test
    void delete_workflow_returns_204() throws Exception {
        doNothing().when(workflowService).deleteWorkflow(5L);

        mockMvc.perform(delete("/api/workflows/5").with(csrf()))
                .andExpect(status().isNoContent());

        verify(workflowService).deleteWorkflow(5L);
    }

    @Test
    void delete_workflow_returns_404_when_not_found() throws Exception {
        doThrow(new WorkflowNotFoundException(99L)).when(workflowService).deleteWorkflow(99L);

        mockMvc.perform(delete("/api/workflows/99").with(csrf()))
                .andExpect(status().isNotFound());
    }

    // ---- POST /api/workflows/{id}/execute ----

    @Test
    void execute_workflow_returns_202() throws Exception {
        doNothing().when(flowEngine).executeWorkflow(eq(5L), any());

        mockMvc.perform(post("/api/workflows/5/execute").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"value\"}"))
                .andExpect(status().isAccepted());

        verify(flowEngine).executeWorkflow(eq(5L), any());
    }

    @Test
    void execute_workflow_with_empty_body_returns_202() throws Exception {
        doNothing().when(flowEngine).executeWorkflow(eq(5L), any());

        mockMvc.perform(post("/api/workflows/5/execute").with(csrf()))
                .andExpect(status().isAccepted());
    }

    // ---- Validation error produces 400 ----

    @Test
    void create_node_with_invalid_props_returns_400() throws Exception {
        when(nodeService.createNode(any()))
                .thenThrow(new IllegalArgumentException("Invalid node configuration: operator must not be blank"));

        var body = "{\"type\":\"CONDITION\",\"props\":{\"field\":\"status\"}}";

        mockMvc.perform(post("/api/workflows/1/nodes").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("operator")));
    }
}
