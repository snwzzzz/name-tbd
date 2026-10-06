package com.example.ntbd.catalog;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Optional;

/**
 * Where an app stores ids inside its settings, and of what: widget props by their catalog prop type,
 * and workflow node settings by key (at a node's top level, or in an action's {@code config}).
 * Loaded from shared/id-references.json, which the editor reads too (pasting widgets).
 */
@Component
public class IdReferences {

    /** What an id points at. */
    public enum Kind {
        WIDGET, PAGE, PAGE_LIST, DATA_SOURCE;

        static Kind of(String name) {
            return switch (name) {
                case "widget" -> WIDGET;
                case "page" -> PAGE;
                case "pageList" -> PAGE_LIST;
                case "dataSource" -> DATA_SOURCE;
                default -> throw new IllegalStateException("Unknown kind of id reference: " + name);
            };
        }
    }

    static final String LOCATION = "shared/id-references.json";

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Document(Map<String, String> widgetPropTypes, Map<String, String> workflowNodeKeys) {}

    private final Map<String, Kind> widgetPropTypes;
    private final Map<String, Kind> workflowNodeKeys;

    public IdReferences() {
        Document document = load();
        this.widgetPropTypes = kinds(document.widgetPropTypes(), "widgetPropTypes");
        this.workflowNodeKeys = kinds(document.workflowNodeKeys(), "workflowNodeKeys");
    }

    /** What a widget prop of this catalog type holds the id of, if any. */
    public Optional<Kind> ofPropType(String propType) {
        return Optional.ofNullable(propType).map(widgetPropTypes::get);
    }

    /** What a workflow node setting with this key holds the id of, if any. */
    public Optional<Kind> ofNodeKey(String key) {
        return Optional.ofNullable(key).map(workflowNodeKeys::get);
    }

    private static Map<String, Kind> kinds(Map<String, String> names, String section) {
        if (names == null || names.isEmpty()) {
            throw new IllegalStateException(LOCATION + " has no " + section);
        }
        return Map.copyOf(names.entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> Kind.of(e.getValue()))));
    }

    private static Document load() {
        try (InputStream in = new ClassPathResource(LOCATION).getInputStream()) {
            return new ObjectMapper().readValue(in, Document.class);
        } catch (IOException e) {
            throw new IllegalStateException("The id references (" + LOCATION + ") couldn't be read", e);
        }
    }
}
