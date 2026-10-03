package com.example.ntbd.dto;

import java.time.Instant;

public record BranchDto(
        Long id,
        String name,
        String description,
        Instant createdAt,
        Instant lastModified,
        String latestVersion,
        UserDto createdBy,
        ApplicationDto application
) { }