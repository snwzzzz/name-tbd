package com.example.ntbd.dto;

import com.example.ntbd.domain.AppTheme;

import java.time.Instant;

/**
 * An application; {@code lastModified}/{@code lastModifiedBy} cover changes to anything in it.
 * {@code theme} is its app-wide theme (null: the default preset).
 */
public record ApplicationDto(
        Long id,
        Long workspaceId,
        String title,
        String description,
        Long defaultBranchId,
        Instant lastModified,
        String lastModifiedBy,
        AppTheme theme
) {
    public ApplicationDto(Long id, Long workspaceId, String title, String description) {
        this(id, workspaceId, title, description, null, null, null, null);
    }
}
