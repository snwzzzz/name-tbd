package com.example.ntbd.catalog;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The widget catalog, loaded from the classpath (the file is shared with the frontend, see
 * shared/widget-catalog.json) and checked once at startup.
 */
@Component
public class WidgetCatalog {

    /** Where the catalog is on the classpath. */
    static final String LOCATION = "shared/widget-catalog.json";

    private final WidgetCatalogDocument document;

    public WidgetCatalog() {
        this(load(LOCATION));
    }

    WidgetCatalog(WidgetCatalogDocument document) {
        validate(document);
        this.document = document;
    }

    public WidgetCatalogDocument document() {
        return document;
    }

    public List<WidgetCatalogDocument.Widget> widgets() {
        return document.widgets();
    }

    public List<WidgetCatalogDocument.Prop> globalProps() {
        return document.globalProps() != null ? document.globalProps() : List.of();
    }

    public Optional<WidgetCatalogDocument.Widget> widget(String type) {
        return widgets().stream().filter(w -> w.type().equals(type)).findFirst();
    }

    /** The default value of each of a widget type's props (none for unknown types). */
    public Map<String, String> defaultsOf(String type) {
        Map<String, String> defaults = new LinkedHashMap<>();
        widget(type).ifPresent(w -> w.props().forEach(p -> defaults.put(p.key(), p.defaultValue())));
        return defaults;
    }

    private static WidgetCatalogDocument load(String location) {
        try (InputStream in = new ClassPathResource(location).getInputStream()) {
            return new ObjectMapper().readValue(in, WidgetCatalogDocument.class);
        } catch (IOException e) {
            throw new IllegalStateException("The widget catalog (" + location + ") couldn't be read", e);
        }
    }

    /** Every widget needs a unique type and name, and unique prop keys with a type. */
    private static void validate(WidgetCatalogDocument document) {
        if (document.widgets() == null || document.widgets().isEmpty()) {
            throw new IllegalStateException("The widget catalog has no widgets");
        }
        Set<String> types = new HashSet<>();
        for (WidgetCatalogDocument.Widget widget : document.widgets()) {
            if (widget.type() == null || widget.type().isBlank() || widget.name() == null) {
                throw new IllegalStateException("A widget in the catalog has no type or name");
            }
            if (!types.add(widget.type())) {
                throw new IllegalStateException("Widget type '" + widget.type() + "' is in the catalog twice");
            }
            Set<String> keys = new HashSet<>();
            for (WidgetCatalogDocument.Prop prop : widget.props()) {
                if (prop.key() == null || prop.type() == null) {
                    throw new IllegalStateException("A prop of widget '" + widget.type() + "' has no key or type");
                }
                if (!keys.add(prop.key())) {
                    throw new IllegalStateException("Prop '" + prop.key() + "' of widget '" + widget.type() + "' is in the catalog twice");
                }
            }
        }
    }
}
