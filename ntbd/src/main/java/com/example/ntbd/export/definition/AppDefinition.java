package com.example.ntbd.export.definition;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * An app as a whole, as the exported app runs it (the frontend's AppDefinition type,
 * core/definition/app-definition.ts). Besides its version and app, it is made of sections that
 * {@link AppDefinitionContributor}s add (pages, data, ...), each a top-level JSON field.
 */
@JsonPropertyOrder({"version", "app"})
public final class AppDefinition {

    /** The format's version; bumped (here and in the frontend) on breaking changes. */
    public static final int VERSION = 1;

    private final App app;
    private final Map<String, Object> sections = new LinkedHashMap<>();

    public AppDefinition(App app) {
        this.app = app;
    }

    public int getVersion() {
        return VERSION;
    }

    public App getApp() {
        return app;
    }

    // Top-level fields in JSON; not a field of its own (the frontend's AppDefinition type lists them)
    @JsonAnyGetter
    @Schema(hidden = true)
    public Map<String, Object> getSections() {
        return Collections.unmodifiableMap(sections);
    }

    /** Adds a section; each name can only be contributed once. */
    public void put(String name, Object section) {
        if (name.equals("version") || name.equals("app") || sections.containsKey(name)) {
            throw new IllegalStateException("The app definition already has a section \"" + name + "\"");
        }
        sections.put(name, section);
    }

    public Object section(String name) {
        return sections.get(name);
    }

    public record App(Long id, String name) {
    }
}
