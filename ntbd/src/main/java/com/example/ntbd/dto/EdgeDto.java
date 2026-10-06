package com.example.ntbd.dto;

import java.time.Instant;

public record EdgeDto(
        Long id,
        Long sourceNodeId,
        Long targetNodeId,
        String sourcePort,
        Instant createdAt,
        Instant lastModified
) {}
