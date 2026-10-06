package com.example.ntbd.dto;

import java.time.Instant;

/** An app key as the editor lists it: never the key, only its start ({@code hint}). */
public record AppKeyDto(
        Long id,
        Long applicationId,
        String hint,
        String label,
        boolean allowWrites,
        Instant createdAt,
        Instant revokedAt
) {
}
