package com.example.ntbd.content;

import com.example.ntbd.catalog.IdReferences;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.catalog.WidgetCatalogDocument;
import com.example.ntbd.export.definition.AppDefinition;
import tools.jackson.databind.ObjectMapper;

import java.util.*;

/**
 * An export definition with its ids renumbered in order of appearance, per kind (page#1, widget#3,
 * ...), also where props and node settings hold them. Two definitions of the same content written
 * with different ids (a duplicate, a restored version) are then equal. The app itself and
 * "dataRevision" (a fingerprint that includes the ids) are left out.
 */
public final class DefinitionNormalizer {

    private final ObjectMapper objectMapper;
    private final WidgetCatalog catalog;
    private final IdReferences references;
    private final Map<String, Map<String, String>> labels = new HashMap<>();

    private DefinitionNormalizer(ObjectMapper objectMapper, WidgetCatalog catalog, IdReferences references) {
        this.objectMapper = objectMapper;
        this.catalog = catalog;
        this.references = references;
    }

    public static Map<String, Object> normalize(AppDefinition definition, ObjectMapper objectMapper,
                                                WidgetCatalog catalog, IdReferences references) {
        return new DefinitionNormalizer(objectMapper, catalog, references).normalize(definition);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> normalize(AppDefinition definition) {
        Map<String, Object> json = objectMapper.readValue(objectMapper.writeValueAsString(definition), Map.class);
        List<Map<String, Object>> pages = (List<Map<String, Object>>) json.get("pages");
        List<Map<String, Object>> dataSources = (List<Map<String, Object>>) json.get("dataSources");

        // Name everything first: props can point to things further down
        for (Map<String, Object> page : pages) {
            label("page", page.get("id"));
            nameWidgets((List<Map<String, Object>>) page.get("components"));
            Map<String, Object> workflow = (Map<String, Object>) page.get("workflow");
            ((List<Map<String, Object>>) workflow.get("nodes")).forEach(n -> label("node", n.get("id")));
            ((List<Map<String, Object>>) workflow.get("edges")).forEach(e -> label("edge", e.get("id")));
        }
        dataSources.forEach(d -> label("data", d.get("id")));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("homePageId", json.get("homePageId"));
        result.put("pages", pages.stream().map(this::page).toList());
        result.put("dataSources", dataSources.stream().map(d -> {
            Map<String, Object> copy = new LinkedHashMap<>(d);
            copy.put("id", label("data", d.get("id")));
            return copy;
        }).toList());
        return result;
    }

    @SuppressWarnings("unchecked")
    private void nameWidgets(List<Map<String, Object>> widgets) {
        if (widgets == null) return;
        for (Map<String, Object> widget : widgets) {
            label("widget", widget.get("id"));
            nameWidgets((List<Map<String, Object>>) widget.get("children"));
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> page(Map<String, Object> page) {
        Map<String, Object> copy = new LinkedHashMap<>(page);
        copy.put("id", label("page", page.get("id")));
        copy.put("components", widgets((List<Map<String, Object>>) page.get("components")));
        Map<String, Object> workflow = (Map<String, Object>) page.get("workflow");
        copy.put("workflow", Map.of(
                "nodes", ((List<Map<String, Object>>) workflow.get("nodes")).stream().map(n -> {
                    Map<String, Object> node = new LinkedHashMap<>(n);
                    node.put("id", label("node", n.get("id")));
                    node.put("props", nodeProps((Map<String, Object>) n.get("props")));
                    return node;
                }).toList(),
                "edges", ((List<Map<String, Object>>) workflow.get("edges")).stream().map(e -> {
                    Map<String, Object> edge = new LinkedHashMap<>(e);
                    edge.put("id", label("edge", e.get("id")));
                    edge.put("sourceNodeId", label("node", e.get("sourceNodeId")));
                    edge.put("targetNodeId", label("node", e.get("targetNodeId")));
                    return edge;
                }).toList()));
        return copy;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> widgets(List<Map<String, Object>> widgets) {
        if (widgets == null) return null;
        return widgets.stream().map(w -> {
            Map<String, Object> copy = new LinkedHashMap<>(w);
            copy.put("id", label("widget", w.get("id")));
            if (w.get("parentId") != null) copy.put("parentId", label("widget", w.get("parentId")));
            Map<String, String> propTypes = new HashMap<>();
            catalog.widget((String) w.get("type")).ifPresent(widget -> {
                for (WidgetCatalogDocument.Prop prop : widget.props()) propTypes.put(prop.key(), prop.type());
            });
            Map<String, Object> props = new LinkedHashMap<>((Map<String, Object>) w.get("props"));
            props.replaceAll((key, value) -> references.ofPropType(propTypes.get(key))
                    .<Object>map(kind -> ref(kind, value)).orElse(value));
            copy.put("props", props);
            if (w.get("children") != null) copy.put("children", widgets((List<Map<String, Object>>) w.get("children")));
            return copy;
        }).toList();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> nodeProps(Map<String, Object> props) {
        Map<String, Object> copy = new LinkedHashMap<>(props);
        copy.replaceAll((key, value) -> {
            if (key.equals("config") && value instanceof Map<?, ?> config) return nodeProps((Map<String, Object>) config);
            return references.ofNodeKey(key).<Object>map(kind -> ref(kind, value)).orElse(value);
        });
        return copy;
    }

    private Object ref(IdReferences.Kind kind, Object value) {
        if (value == null) return null;
        return switch (kind) {
            case WIDGET -> labelOrSame("widget", value);
            case PAGE -> labelOrSame("page", value);
            case DATA_SOURCE -> labelOrSame("data", value);
            case PAGE_LIST -> {
                List<?> ids = objectMapper.readValue(value.toString(), List.class);
                yield ids.stream().map(id -> labelOrSame("page", id)).toList();
            }
        };
    }

    /** The label of a known id; anything else ("", "all", ...) as it is. */
    private Object labelOrSame(String kind, Object value) {
        String label = labels.getOrDefault(kind, Map.of()).get(String.valueOf(value).trim());
        return label != null ? label : value;
    }

    private String label(String kind, Object id) {
        Map<String, String> ofKind = labels.computeIfAbsent(kind, k -> new HashMap<>());
        return ofKind.computeIfAbsent(String.valueOf(id), k -> kind + "#" + (ofKind.size() + 1));
    }
}
