package com.example.ntbd.commands;

import java.time.LocalDateTime;

public record NewVersionControlCommand(
        Long id,
        Long branchId,
        Long modifiedById,
        LocalDateTime timestamp,
        String applicationDefinition,
        String version
) {
}
