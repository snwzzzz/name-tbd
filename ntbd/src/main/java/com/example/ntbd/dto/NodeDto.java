package com.example.ntbd.dto;

import java.time.Instant;
import java.util.Map;

public record NodeDto(
        Long id,
        Long workflowId,
        String type,
        Map<String, Object> props,
        Double x,
        Double y,
        Instant createdAt,
        Instant lastModified
) {}
