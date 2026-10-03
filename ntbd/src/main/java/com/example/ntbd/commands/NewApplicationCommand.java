package com.example.ntbd.commands;

/** A new application in workspace {@code workspaceId}. */
public record NewApplicationCommand (
        Long workspaceId,
        String title,
        String description
)
{ }
