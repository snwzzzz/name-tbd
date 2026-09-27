package com.example.ntbd.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record NodeDto(
        Long id,
        Long workflowId,
        String type,
        Map<String, Object> props,
        LocalDateTime createdAt,
        LocalDateTime lastModified
) {}
