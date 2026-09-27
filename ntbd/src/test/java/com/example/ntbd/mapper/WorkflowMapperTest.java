package com.example.ntbd.mapper;

import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.dto.WorkflowDto;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class WorkflowMapperTest {

    @Test
    void maps_workflow_to_dto() {
        var branch = Branch.builder().id(new Branch.BranchId(5L)).build();
        var workflow = Workflow.builder()
                .id(new Workflow.WorkflowId(1L))
                .name("Test Flow")
                .status(WorkflowStatus.ACTIVE)
                .branch(branch)
                .build();

        WorkflowDto dto = WorkflowMapper.toDto(workflow);

        assertNotNull(dto);
        assertEquals(1L, dto.id());
        assertEquals("Test Flow", dto.name());
        assertEquals(WorkflowStatus.ACTIVE, dto.status());
        assertEquals(5L, dto.branchId());
    }

    @Test
    void maps_dto_to_workflow_entity() {
        var dto = new WorkflowDto(1L, "Test Flow", WorkflowStatus.DRAFT, null, null, 5L);

        Workflow workflow = WorkflowMapper.toEntity(dto);

        assertNotNull(workflow);
        assertEquals(1L, workflow.getId().id());
        assertEquals("Test Flow", workflow.getName());
        assertEquals(WorkflowStatus.DRAFT, workflow.getStatus());
        assertEquals(5L, workflow.getBranch().getId().id());
    }

    @Test
    void handles_null_input() {
        assertNull(WorkflowMapper.toDto(null));
        assertNull(WorkflowMapper.toEntity(null));
    }

    @Test
    void handles_null_branch() {
        var workflow = Workflow.builder()
                .id(new Workflow.WorkflowId(1L))
                .name("No Branch")
                .status(WorkflowStatus.DRAFT)
                .branch(null)
                .build();

        WorkflowDto dto = WorkflowMapper.toDto(workflow);

        assertNull(dto.branchId());
    }
}
