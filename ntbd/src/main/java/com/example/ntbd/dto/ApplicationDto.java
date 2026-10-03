package com.example.ntbd.dto;

public record ApplicationDto(
        Long id,
        Long workspaceId,
        String title,
        String description
) { }
