package com.example.ntbd.catalog;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * The widget catalog (shared/widget-catalog.json): the one registry of widget types, read by the
 * frontend and the backend alike.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WidgetCatalogDocument(
        int version,
        List<Category> categories,
        List<Widget> widgets
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Category(String id, String label) {}

    /** A widget type: how it's listed, sized and configured. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Widget(
            String type,
            String name,
            String icon,
            String category,
            List<String> keywords,
            Size size,
            Boolean resizable,
            Boolean palette,
            Boolean container,
            List<Prop> props
    ) {
        public List<Prop> props() {
            return props != null ? props : List.of();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Size(Integer w, Integer h, Integer minW, Integer minH) {}

    /** A setting of a widget; values are stored as text, so the default is text too. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Prop(
            String key,
            String type,
            String label,
            String group,
            @JsonProperty("default") String defaultValue,
            List<String> options
    ) {}
}
