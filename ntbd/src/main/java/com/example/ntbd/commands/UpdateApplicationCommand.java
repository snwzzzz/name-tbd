package com.example.ntbd.commands;

import com.example.ntbd.domain.AppTheme;

/** Changes an application's title, description and/or theme (null: unchanged). */
public record UpdateApplicationCommand(
        String title,
        String description,
        AppTheme theme
) {
    public UpdateApplicationCommand(String title, String description) {
        this(title, description, null);
    }
}
