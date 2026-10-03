package com.example.ntbd.dto;

import java.time.Instant;

/** An application; {@code lastModified}/{@code lastModifiedBy} cover changes to anything in it. */
public record ApplicationDto(
        Long id,
        Long workspaceId,
        String title,
        String description,
        Long defaultBranchId,
        Instant lastModified,
        String lastModifiedBy
) {
    public ApplicationDto(Long id, Long workspaceId, String title, String description) {
        this(id, workspaceId, title, description, null, null, null);
    }
}
