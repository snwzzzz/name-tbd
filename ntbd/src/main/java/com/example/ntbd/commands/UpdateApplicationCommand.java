package com.example.ntbd.commands;

public record UpdateApplicationCommand(
        Long id,
        String title,
        String description
) { }
