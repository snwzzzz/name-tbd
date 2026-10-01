package com.example.ntbd.dto;

import java.util.List;

/** One setting of a widget type, as the widget catalog defines it. */
public record WidgetPropDefinitionDto(
        Long id,
        String widgetType,
        String propKey,
        String propType,
        String defaultValue,
        String label,
        String group,
        List<String> options
) {
}
