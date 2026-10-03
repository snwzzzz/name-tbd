package com.example.ntbd.commands;

/** Changes an application's title and/or description (null: unchanged). */
public record UpdateApplicationCommand(
        String title,
        String description
) {
}
