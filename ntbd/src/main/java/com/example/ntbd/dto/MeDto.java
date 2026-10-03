package com.example.ntbd.dto;

import java.util.List;

/** The signed-in user and the workspaces they belong to (personal workspace first). */
public record MeDto(
        UserDto user,
        List<WorkspaceMembershipDto> workspaces
) {
    public record WorkspaceMembershipDto(Long id, String name, boolean personal, String role) {}
}
