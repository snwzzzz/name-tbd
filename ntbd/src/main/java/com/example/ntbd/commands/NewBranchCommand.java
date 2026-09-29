package com.example.ntbd.commands;

public record NewBranchCommand(
        Long applicationId,
        Long createdById,
        String name,
        String description
) {
}
