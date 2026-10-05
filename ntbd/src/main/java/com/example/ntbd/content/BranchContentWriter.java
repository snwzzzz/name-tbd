package com.example.ntbd.content;

import com.example.ntbd.catalog.IdReferences;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.catalog.WidgetCatalogDocument;
import com.example.ntbd.content.BranchContent.*;
import com.example.ntbd.domain.*;
import com.example.ntbd.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.*;

/**
 * Writes {@link BranchContent} into a branch, as new pages, widgets, workflows (nodes, edges) and data
 * sources next to what's there already. Call within a transaction.
 * <p>
 * Everything gets new ids, so every place that stores an id is rewritten to the new one: a widget's
 * parent and workflow, a workflow's page, an edge's nodes, and the widget props and workflow node
 * settings that shared/id-references.json lists ({@link IdReferences}). An id that points to nothing
 * in the content is cleared, so what's written never points elsewhere.
 */
@RequiredArgsConstructor
@Component
public class BranchContentWriter {

    private final PageRepository pageRepository;
    private final UiComponentRepository componentRepository;
    private final WorkflowRepository workflowRepository;
    private final NodeRepository nodeRepository;
    private final EdgeRepository edgeRepository;
    private final DataSourceRepository dataSourceRepository;
    private final WidgetCatalog widgetCatalog;
    private final IdReferences references;
    private final ObjectMapper objectMapper;

    /** The content's ids → the written ones, per kind of thing. */
    public static final class IdMap {
        public final Map<Long, Long> pages = new HashMap<>();
        public final Map<Long, Long> dataSources = new HashMap<>();
        public final Map<Long, Long> workflows = new HashMap<>();
        public final Map<Long, Long> widgets = new HashMap<>();
        public final Map<Long, Long> nodes = new HashMap<>();
    }

    public IdMap write(BranchContent content, Branch branch) {
        if (content.format() != BranchContent.FORMAT) {
            throw new IllegalArgumentException("Unknown content format " + content.format());
        }
        IdMap ids = new IdMap();
        content.dataSources().forEach(source -> writeDataSource(source, branch, ids));
        content.pages().forEach(page -> ids.pages.put(page.id(), pageRepository.save(Page.builder()
                .name(page.name()).path(page.path()).layout(page.layout()).branch(branch)
                .variables(page.variables()).build()).getId().id()));
        branch.setVariables(content.variables());
        content.workflows().forEach(workflow -> ids.workflows.put(workflow.id(), workflowRepository.save(Workflow.builder()
                .name(workflow.name()).status(workflow.status()).branch(branch)
                .page(pageRef(ids.pages.get(workflow.pageId())))
                .build()).getId().id()));
        content.pages().forEach(page -> writeWidgets(page, ids));
        content.workflows().forEach(workflow -> writeGraph(workflow, ids));
        return ids;
    }

    private void writeDataSource(DataSourceContent source, Branch branch, IdMap ids) {
        DataSource copy = DataSource.builder().name(source.name()).format(source.format()).branch(branch).build();
        List<DataSourceColumn> columns = new ArrayList<>();
        for (int i = 0; i < source.columns().size(); i++) {
            DataSourceColumn column = DataSourceColumn.builder().dataSource(copy).columnIndex(i).name(source.columns().get(i)).build();
            copy.getColumns().add(column);
            columns.add(column);
        }
        for (int r = 0; r < source.rows().size(); r++) {
            List<String> values = source.rows().get(r);
            DataSourceRow row = DataSourceRow.builder().dataSource(copy).rowIndex(r).build();
            for (int i = 0; i < Math.min(values.size(), columns.size()); i++) {
                if (values.get(i) == null) continue;
                row.getCells().add(DataSourceCell.builder().row(row).column(columns.get(i)).value(values.get(i)).build());
            }
            copy.getRows().add(row);
        }
        ids.dataSources.put(source.id(), dataSourceRepository.save(copy).getId().id());
    }

    /** The page's widgets, parents before their children. */
    private void writeWidgets(PageContent page, IdMap ids) {
        Page target = pageRef(ids.pages.get(page.id()));
        List<WidgetContent> pending = new ArrayList<>(page.widgets());
        while (!pending.isEmpty()) {
            int before = pending.size();
            for (Iterator<WidgetContent> it = pending.iterator(); it.hasNext(); ) {
                WidgetContent widget = it.next();
                if (widget.parentId() != null && !ids.widgets.containsKey(widget.parentId())) continue;
                ids.widgets.put(widget.id(), writeWidget(widget, target, ids));
                it.remove();
            }
            if (pending.size() == before) {
                throw new IllegalStateException("Widgets of page " + page.id() + " have parents on another page");
            }
        }
    }

    private Long writeWidget(WidgetContent widget, Page page, IdMap ids) {
        Long parentId = widget.parentId() != null ? ids.widgets.get(widget.parentId()) : null;
        Long workflowId = widget.workflowId() != null ? ids.workflows.get(widget.workflowId()) : null;
        UiComponent copy = UiComponent.builder()
                .page(page)
                .type(widget.type())
                .parent(parentId != null ? componentRepository.getReferenceById(new UiComponent.UiComponentId(parentId)) : null)
                .workflow(workflowId != null ? workflowRepository.getReferenceById(new Workflow.WorkflowId(workflowId)) : null)
                .x(widget.x()).y(widget.y()).w(widget.w()).h(widget.h())
                .build();
        Map<String, String> propTypes = propTypesOf(widget.type());
        widget.props().forEach((key, value) -> {
            UiComponentProperty property = new UiComponentProperty();
            property.setComponent(copy);
            property.setPropKey(key);
            property.setPropValue(rewriteProp(propTypes.get(key), value, ids));
            copy.getProperties().add(property);
        });
        return componentRepository.save(copy).getId().id();
    }

    private void writeGraph(WorkflowContent workflow, IdMap ids) {
        Workflow target = workflowRepository.getReferenceById(new Workflow.WorkflowId(ids.workflows.get(workflow.id())));
        Map<Long, Node> nodes = new HashMap<>();
        for (NodeContent node : workflow.nodes()) {
            Node saved = nodeRepository.save(Node.builder()
                    .workflow(target).type(node.type()).x(node.x()).y(node.y())
                    .props(rewriteNodeProps(node.props(), ids))
                    .build());
            nodes.put(node.id(), saved);
            ids.nodes.put(node.id(), saved.getId().id());
        }
        for (EdgeContent edge : workflow.edges()) {
            Node from = nodes.get(edge.sourceNodeId());
            Node to = nodes.get(edge.targetNodeId());
            if (from == null || to == null) continue;
            edgeRepository.save(Edge.builder().sourceNode(from).targetNode(to).sourcePort(edge.sourcePort()).build());
        }
    }

    // ---- Rewriting ids ----

    private Map<String, String> propTypesOf(String widgetType) {
        Map<String, String> types = new HashMap<>();
        widgetCatalog.widget(widgetType).ifPresent(widget -> {
            for (WidgetCatalogDocument.Prop prop : widget.props()) types.put(prop.key(), prop.type());
        });
        return types;
    }

    private String rewriteProp(String propType, String value, IdMap ids) {
        if (value == null || value.isBlank()) return value;
        return references.ofPropType(propType).map(kind -> rewrite(kind, value, ids)).orElse(value);
    }

    private String rewrite(IdReferences.Kind kind, String value, IdMap ids) {
        return switch (kind) {
            case WIDGET -> mapId(value, ids.widgets);
            case PAGE -> mapId(value, ids.pages);
            case PAGE_LIST -> mapIdArray(value, ids.pages);
            case DATA_SOURCE -> mapId(value, ids.dataSources);
        };
    }

    private Map<String, Object> rewriteNodeProps(Map<String, Object> props, IdMap ids) {
        if (props == null) return null;
        Map<String, Object> copy = rewriteNodeKeys(props, ids);
        if (copy.get("config") instanceof Map<?, ?> config) {
            @SuppressWarnings("unchecked")
            Map<String, Object> typed = (Map<String, Object>) config;
            copy.put("config", rewriteNodeKeys(typed, ids));
        }
        return copy;
    }

    private Map<String, Object> rewriteNodeKeys(Map<String, Object> values, IdMap ids) {
        Map<String, Object> copy = new LinkedHashMap<>(values);
        copy.replaceAll((key, value) -> {
            if (value == null) return null;
            return references.ofNodeKey(key).<Object>map(kind -> rewrite(kind, value.toString(), ids)).orElse(value);
        });
        return copy;
    }

    /** The new id for {@code value}; a non-numeric value (e.g. "all") stays, an unknown id is cleared. */
    private static String mapId(String value, Map<Long, Long> ids) {
        Long id = parseId(value);
        if (id == null) return value;
        Long mapped = ids.get(id);
        return mapped != null ? String.valueOf(mapped) : "";
    }

    private String mapIdArray(String json, Map<Long, Long> ids) {
        try {
            List<?> values = objectMapper.readValue(json, List.class);
            List<Object> mapped = new ArrayList<>();
            for (Object value : values) {
                Long id = value == null ? null : parseId(value.toString());
                Long newId = id != null ? ids.get(id) : null;
                if (newId != null) mapped.add(value instanceof Number ? newId : String.valueOf(newId));
            }
            return objectMapper.writeValueAsString(mapped);
        } catch (JacksonException e) {
            return "[]";
        }
    }

    private static Long parseId(String value) {
        try {
            return Long.valueOf(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Page pageRef(Long id) {
        return id == null ? null : pageRepository.getReferenceById(new Page.PageId(id));
    }
}
