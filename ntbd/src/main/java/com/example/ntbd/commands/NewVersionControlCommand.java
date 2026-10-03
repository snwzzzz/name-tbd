package com.example.ntbd.commands;

import java.time.LocalDateTime;

/** A new version of branch {@code branchId}; the signed-in user is its author. */
public record NewVersionControlCommand(
        Long id,
        Long branchId,
        LocalDateTime timestamp,
        String applicationDefinition,
        String version
) {
}
