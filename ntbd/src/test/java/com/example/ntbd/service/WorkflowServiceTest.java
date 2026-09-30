package com.example.ntbd.service;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.Exception.PageNotFoundException;
import com.example.ntbd.Exception.WorkflowNotFoundException;
import com.example.ntbd.commands.NewWorkflowCommand;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Page;
import com.example.ntbd.persistence.PageRepository;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.dto.WorkflowDto;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.WorkflowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class WorkflowServiceTest {

    @Mock
    private WorkflowRepository workflowRepository;

    @Mock
    private BranchRepository branchRepository;

    @Mock
    private PageRepository pageRepository;

    private WorkflowService workflowService;

    @BeforeEach
    void setUp() {
        workflowService = new WorkflowService(workflowRepository, branchRepository, pageRepository);
    }

    // ---- findOrCreateForPage ----

    @Test
    void findOrCreateForPage_returns_existing_workflow() {
        var page = Page.builder().id(new Page.PageId(3L)).name("Home").build();
        var existing = Workflow.builder().id(new Workflow.WorkflowId(9L)).name("Home workflow").status(WorkflowStatus.DRAFT).page(page).build();
        when(pageRepository.findById(new Page.PageId(3L))).thenReturn(Optional.of(page));
        when(workflowRepository.findFirstByPage_Id(new Page.PageId(3L))).thenReturn(Optional.of(existing));

        WorkflowDto dto = workflowService.findOrCreateForPage(3L);

        assertThat(dto.id()).isEqualTo(9L);
        verify(workflowRepository, never()).saveAndFlush(any());
    }

    @Test
    void findOrCreateForPage_creates_workflow_for_page_on_first_access() {
        var branch = Branch.builder().id(new Branch.BranchId(1L)).name("main").description("d").build();
        var page = Page.builder().id(new Page.PageId(3L)).name("Home").branch(branch).build();
        when(pageRepository.findById(new Page.PageId(3L))).thenReturn(Optional.of(page));
        when(workflowRepository.findFirstByPage_Id(new Page.PageId(3L))).thenReturn(Optional.empty());
        when(workflowRepository.saveAndFlush(any(Workflow.class))).thenAnswer(inv -> inv.getArgument(0));

        WorkflowDto dto = workflowService.findOrCreateForPage(3L);

        ArgumentCaptor<Workflow> captor = ArgumentCaptor.forClass(Workflow.class);
        verify(workflowRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getPage()).isEqualTo(page);
        assertThat(captor.getValue().getBranch()).isEqualTo(branch);
        assertThat(dto.name()).isEqualTo("Home workflow");
    }

    @Test
    void findOrCreateForPage_throws_when_page_missing() {
        when(pageRepository.findById(new Page.PageId(404L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.findOrCreateForPage(404L))
                .isInstanceOf(PageNotFoundException.class);
    }

    // ---- createWorkflow ----

    @Test
    void createWorkflow_saves_workflow_and_returns_dto() {
        var branch = Branch.builder().id(new Branch.BranchId(1L)).name("main").description("d").build();
        var command = new NewWorkflowCommand(1L, "My Flow", WorkflowStatus.DRAFT);

        when(branchRepository.findById(new Branch.BranchId(1L))).thenReturn(Optional.of(branch));
        when(workflowRepository.saveAndFlush(any(Workflow.class))).thenAnswer(inv -> {
            Workflow w = inv.getArgument(0);
            w = Workflow.builder()
                    .id(new Workflow.WorkflowId(10L))
                    .name(w.getName())
                    .status(w.getStatus())
                    .branch(w.getBranch())
                    .build();
            return w;
        });

        WorkflowDto dto = workflowService.createWorkflow(command);

        assertThat(dto).isNotNull();
        assertThat(dto.name()).isEqualTo("My Flow");
        assertThat(dto.status()).isEqualTo(WorkflowStatus.DRAFT);
        assertThat(dto.branchId()).isEqualTo(1L);

        ArgumentCaptor<Workflow> captor = ArgumentCaptor.forClass(Workflow.class);
        verify(workflowRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getBranch()).isSameAs(branch);
    }

    @Test
    void createWorkflow_defaults_status_to_draft_when_null() {
        var branch = Branch.builder().id(new Branch.BranchId(1L)).name("main").description("d").build();
        var command = new NewWorkflowCommand(1L, "My Flow", null);

        when(branchRepository.findById(new Branch.BranchId(1L))).thenReturn(Optional.of(branch));
        when(workflowRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        workflowService.createWorkflow(command);

        ArgumentCaptor<Workflow> captor = ArgumentCaptor.forClass(Workflow.class);
        verify(workflowRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(WorkflowStatus.DRAFT);
    }

    @Test
    void createWorkflow_allows_null_branch_id() {
        var command = new NewWorkflowCommand(null, "No Branch Flow", WorkflowStatus.DRAFT);
        when(workflowRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        WorkflowDto dto = workflowService.createWorkflow(command);

        assertThat(dto).isNotNull();
        assertThat(dto.branchId()).isNull();
        verifyNoInteractions(branchRepository);
    }

    @Test
    void createWorkflow_throws_when_branch_not_found() {
        var command = new NewWorkflowCommand(99L, "My Flow", WorkflowStatus.DRAFT);
        when(branchRepository.findById(new Branch.BranchId(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.createWorkflow(command))
                .isInstanceOf(BranchNotFoundException.class)
                .hasMessageContaining("99");

        verify(workflowRepository, never()).saveAndFlush(any());
    }

    // ---- findById ----

    @Test
    void findById_returns_dto_when_found() {
        var workflow = Workflow.builder()
                .id(new Workflow.WorkflowId(5L))
                .name("Flow")
                .status(WorkflowStatus.ACTIVE)
                .build();
        when(workflowRepository.findById(new Workflow.WorkflowId(5L))).thenReturn(Optional.of(workflow));

        WorkflowDto dto = workflowService.findById(5L);

        assertThat(dto.id()).isEqualTo(5L);
        assertThat(dto.name()).isEqualTo("Flow");
    }

    @Test
    void findById_throws_when_not_found() {
        when(workflowRepository.findById(new Workflow.WorkflowId(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workflowService.findById(99L))
                .isInstanceOf(WorkflowNotFoundException.class)
                .hasMessageContaining("99");
    }

    // ---- findByBranchId ----

    @Test
    void findByBranchId_returns_list_of_dtos() {
        var w1 = Workflow.builder().id(new Workflow.WorkflowId(1L)).name("W1").status(WorkflowStatus.DRAFT).build();
        var w2 = Workflow.builder().id(new Workflow.WorkflowId(2L)).name("W2").status(WorkflowStatus.ACTIVE).build();
        when(workflowRepository.findByBranch_Id(new Branch.BranchId(7L))).thenReturn(List.of(w1, w2));

        List<WorkflowDto> dtos = workflowService.findByBranchId(7L);

        assertThat(dtos.size()).isEqualTo(2);
        assertThat(dtos.get(0).name()).isEqualTo("W1");
        assertThat(dtos.get(1).name()).isEqualTo("W2");
    }

    // ---- deleteWorkflow ----

    @Test
    void deleteWorkflow_deletes_when_exists() {
        when(workflowRepository.existsById(new Workflow.WorkflowId(5L))).thenReturn(true);

        workflowService.deleteWorkflow(5L);

        verify(workflowRepository).deleteById(new Workflow.WorkflowId(5L));
    }

    @Test
    void deleteWorkflow_throws_when_not_found() {
        when(workflowRepository.existsById(new Workflow.WorkflowId(99L))).thenReturn(false);

        assertThatThrownBy(() -> workflowService.deleteWorkflow(99L))
                .isInstanceOf(WorkflowNotFoundException.class)
                .hasMessageContaining("99");

        verify(workflowRepository, never()).deleteById(any());
    }
}
