package com.example.ntbd.mapper;

import com.example.ntbd.domain.Timestamps;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.dto.WorkflowDto;

public class WorkflowMapper {

    public static WorkflowDto toDto(Workflow workflow) {
        if (workflow == null) return null;

        Long branchId = null;
        if (workflow.getBranch() != null && workflow.getBranch().getId() != null) {
            branchId = workflow.getBranch().getId().id();
        }

        return new WorkflowDto(
                workflow.getId() != null ? workflow.getId().id() : null,
                workflow.getName(),
                workflow.getStatus(),
                Timestamps.toInstant(workflow.getCreatedAt()),
                Timestamps.toInstant(workflow.getLastModified()),
                branchId
        );
    }

    public static Workflow toEntity(WorkflowDto dto) {
        if (dto == null) return null;

        Workflow workflow = Workflow.builder()
                .id(dto.id() != null ? new Workflow.WorkflowId(dto.id()) : null)
                .name(dto.name())
                .status(dto.status())
                .branch(dto.branchId() != null
                        ? Branch.builder().id(new Branch.BranchId(dto.branchId())).build()
                        : null)
                .build();
        workflow.setCreatedAt(Timestamps.fromInstant(dto.createdAt()));
        workflow.setLastModified(Timestamps.fromInstant(dto.lastModified()));
        return workflow;
    }
}
