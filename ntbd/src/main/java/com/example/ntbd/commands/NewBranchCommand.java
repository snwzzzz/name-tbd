package com.example.ntbd.commands;

/** A new branch of application {@code applicationId}; the signed-in user creates it. */
public record NewBranchCommand(
        Long applicationId,
        String name,
        String description
) {
}
