package com.example.ntbd.commands;

import com.example.ntbd.domain.WorkflowStatus;

public record NewWorkflowCommand(
        Long branchId,
        String name,
        WorkflowStatus status
) {}
