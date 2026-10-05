package com.example.ntbd.catalog;

import com.example.ntbd.domain.AppTheme;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * The app-wide themes an application can have (shared/app-themes.json, which the editor and the
 * exported app read too): checks a theme before it's saved. The frontend turns it into CSS.
 */
@Component
public class AppThemes {

    static final String LOCATION = "shared/app-themes.json";
    public static final String CUSTOM = "Custom";
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Document(Map<String, Object> fonts, Map<String, Object> radii, Map<String, Object> spacings, Map<String, Object> presets) {}

    private final Document document;

    public AppThemes() {
        this.document = load();
    }

    /**
     * The theme as it's stored: a known preset, or "Custom" with known names and a #rrggbb color
     * (blank values are left out, so they come from the preset). Null stays null (the default preset).
     *
     * @throws IllegalArgumentException for a preset, font, corners or spacing that doesn't exist, or a malformed color
     */
    public AppTheme check(AppTheme theme) {
        if (theme == null) return null;
        String preset = blankToNull(theme.preset());
        if (preset == null || (!preset.equals(CUSTOM) && !document.presets().containsKey(preset))) {
            throw new IllegalArgumentException("Unknown theme preset: " + preset);
        }
        if (!preset.equals(CUSTOM)) return new AppTheme(preset, null, null, null, null);
        String primary = blankToNull(theme.primary());
        if (primary != null && !HEX_COLOR.matcher(primary).matches()) {
            throw new IllegalArgumentException("The theme's primary color must be like #2f89ff: " + primary);
        }
        return new AppTheme(CUSTOM, primary,
                known("font", theme.font(), document.fonts()),
                known("corners", theme.radius(), document.radii()),
                known("spacing", theme.spacing(), document.spacings()));
    }

    private static String known(String what, String name, Map<String, Object> names) {
        String value = blankToNull(name);
        if (value != null && !names.containsKey(value)) throw new IllegalArgumentException("Unknown theme " + what + ": " + value);
        return value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static Document load() {
        try (InputStream in = new ClassPathResource(LOCATION).getInputStream()) {
            Document document = new ObjectMapper().readValue(in, Document.class);
            if (document.presets() == null || document.presets().isEmpty()) {
                throw new IllegalStateException("The themes (" + LOCATION + ") have no presets");
            }
            return document;
        } catch (IOException e) {
            throw new IllegalStateException("The themes (" + LOCATION + ") couldn't be read", e);
        }
    }
}
