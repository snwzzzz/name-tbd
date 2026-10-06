package com.example.ntbd.commands;

/** Duplicates an application; without {@code title}, the copy is called "<title> (copy)". */
public record DuplicateApplicationCommand(
        String title
) {
}
