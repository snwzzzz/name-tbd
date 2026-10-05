package com.example.ntbd.dto;

import com.example.ntbd.domain.Timestamps;
import com.example.ntbd.domain.VersionKind;

import java.time.Instant;
import java.time.LocalDateTime;

/** A version of a branch, as the History panel lists it (without its content). */
public record VersionDto(
        Long id,
        int number,
        VersionKind kind,
        String label,
        Instant createdAt,
        String author,
        long sizeBytes
) {

    public VersionDto(Long id, Integer number, VersionKind kind, String label, LocalDateTime createdAt, String author,
                      Long sizeBytes) {
        this(id, number, kind, label, Timestamps.toInstant(createdAt), author, sizeBytes);
    }
}
