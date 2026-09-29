package com.example.ntbd.dto;

import java.time.LocalDateTime;

public record EdgeDto(
        Long id,
        Long sourceNodeId,
        Long targetNodeId,
        String sourcePort,
        LocalDateTime createdAt,
        LocalDateTime lastModified
) {}
