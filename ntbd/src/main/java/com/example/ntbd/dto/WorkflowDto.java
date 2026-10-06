package com.example.ntbd.dto;

import com.example.ntbd.domain.WorkflowStatus;

import java.time.Instant;

public record WorkflowDto(
        Long id,
        String name,
        WorkflowStatus status,
        Instant createdAt,
        Instant lastModified,
        Long branchId
) {}
