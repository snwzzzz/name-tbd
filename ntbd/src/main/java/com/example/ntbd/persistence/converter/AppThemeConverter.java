package com.example.ntbd.persistence.converter;

import com.example.ntbd.domain.AppTheme;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/** An application's theme as JSON text (null: none, the default preset). */
@Converter(autoApply = true)
public class AppThemeConverter implements AttributeConverter<AppTheme, String> {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(AppTheme theme) {
        return theme == null ? null : JSON.writeValueAsString(theme);
    }

    @Override
    public AppTheme convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return JSON.readValue(json, AppTheme.class);
        } catch (JacksonException e) {
            // A theme that can't be read is no theme: the app shows the default preset
            return null;
        }
    }
}
