package com.example.ntbd.dto;

/** A page; {@code layout} marks the branch's layout page (its widgets show on every other page). */
public record PageDto(
        Long id,
        String name,
        String path,
        Long branchId,
        boolean layout
) {
    /** A regular (non-layout) page. */
    public PageDto(Long id, String name, String path, Long branchId) {
        this(id, name, path, branchId, false);
    }
}
