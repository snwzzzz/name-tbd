package com.example.ntbd.dto;

import com.example.ntbd.domain.WorkflowStatus;

import java.time.LocalDateTime;

public record WorkflowDto(
        Long id,
        String name,
        WorkflowStatus status,
        LocalDateTime createdAt,
        LocalDateTime lastModified,
        Long branchId
) {}
