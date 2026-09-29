package com.example.ntbd.dto;

import java.time.LocalDateTime;

public record VersionControlDto(
        Long id,
        String version,
        BranchDto branch,
        LocalDateTime timestamp,
        String applicationDefinition,
        UserDto modifiedBy
) {}
