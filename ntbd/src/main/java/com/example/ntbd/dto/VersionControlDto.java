package com.example.ntbd.dto;

import java.time.Instant;

public record VersionControlDto(
        Long id,
        String version,
        BranchDto branch,
        Instant timestamp,
        String applicationDefinition,
        UserDto modifiedBy
) {}
