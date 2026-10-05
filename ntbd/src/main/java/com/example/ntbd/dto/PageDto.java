package com.example.ntbd.dto;

import com.example.ntbd.domain.VariableDefinition;

import java.util.List;

/**
 * A page; {@code layout} marks the branch's layout page (its widgets show on every other page).
 * {@code variables} are the page's own (see VariableDefinition).
 */
public record PageDto(
        Long id,
        String name,
        String path,
        Long branchId,
        boolean layout,
        List<VariableDefinition> variables
) {
    public PageDto(Long id, String name, String path, Long branchId, boolean layout) {
        this(id, name, path, branchId, layout, List.of());
    }

    /** A regular (non-layout) page. */
    public PageDto(Long id, String name, String path, Long branchId) {
        this(id, name, path, branchId, false);
    }
}
