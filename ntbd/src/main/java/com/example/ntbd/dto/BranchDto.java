package com.example.ntbd.dto;

import java.time.LocalDateTime;

public record BranchDto(
        Long id,
        String name,
        String description,
        LocalDateTime createdAt,
        LocalDateTime lastModified,
        String latestVersion,
        UserDto createdBy,
        ApplicationDto application
) { }