package com.example.ntbd.domain;

/**
 * An application's app-wide theme: a preset, or "Custom" with its own primary color, font, corners
 * and spacing (the names are those of shared/app-themes.json; see catalog/AppThemes, which checks
 * them). Fields a theme doesn't set come from its preset. Stored as JSON on the application.
 */
public record AppTheme(
        String preset,
        String primary,
        String font,
        String radius,
        String spacing
) {
}
