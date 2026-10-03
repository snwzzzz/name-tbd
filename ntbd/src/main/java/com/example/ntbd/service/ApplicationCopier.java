package com.example.ntbd.service;

import com.example.ntbd.Exception.ApplicationNotFoundException;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.catalog.WidgetCatalogDocument;
import com.example.ntbd.domain.*;
import com.example.ntbd.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.*;

/**
 * Copies an application: its default branch with the pages, widgets, workflows (nodes, edges) and
 * data sources in it, as the new application's default branch. Versions stay behind (the copy starts
 * its own history), and so do other branches.
 * <p>
 * Everything gets new ids, so every place that stores an id is rewritten to the copy's id:
 * <ul>
 *   <li>a widget's parent and workflow (columns);</li>
 *   <li>widget props of the catalog's prop types {@code page}, {@code pages} (a JSON array) and
 *       {@code dataSource};</li>
 *   <li>node props: {@link #NODE_WIDGET_KEYS} (widget ids) and {@link #NODE_PAGE_KEYS} (page ids), at
 *       the top level (triggers) or in {@code config} (actions).</li>
 * </ul>
 * An id that points to nothing in the source branch is cleared, so the copy never points into the original.
 * <b>A new prop type or action config holding an id must be added here</b>, or copies keep pointing to
 * the original's widgets.
 */
@RequiredArgsConstructor
@Component
public class ApplicationCopier {

    /** Node props (or their {@code config}) holding a widget id; see FlowNode types in the editor. */
    static final Set<String> NODE_WIDGET_KEYS = Set.of("elementId", "targetId", "tableId", "detailId", "inputId");
    /** Node props (or their {@code config}) holding a page id. */
    static final Set<String> NODE_PAGE_KEYS = Set.of("detailPageId");

    private final ApplicationRepository applicationRepository;
    private final BranchRepository branchRepository;
    private final PageRepository pageRepository;
    private final UiComponentRepository componentRepository;
    private final WorkflowRepository workflowRepository;
    private final NodeRepository nodeRepository;
    private final EdgeRepository edgeRepository;
    private final DataSourceRepository dataSourceRepository;
    private final WidgetCatalog widgetCatalog;
    private final ObjectMapper objectMapper;

    /** Old id → new id, per kind of thing. */
    private static final class IdMap {
        final Map<Long, Long> pages = new HashMap<>();
        final Map<Long, Long> dataSources = new HashMap<>();
        final Map<Long, Long> workflows = new HashMap<>();
        final Map<Long, Long> components = new HashMap<>();
    }

    /** Copies the application within its workspace, titled {@code title}, created by {@code user}. Call within a transaction. */
    public Application copy(Long applicationId, String title, User user) {
        Application source = applicationRepository.findById(new Application.ApplicationId(applicationId))
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));
        Branch sourceBranch = source.getDefaultBranch();

        Application copy = applicationRepository.save(Application.builder()
                .workspace(source.getWorkspace())
                .title(title)
                .description(source.getDescription())
                .lastModifiedBy(user)
                .build());
        Branch branch = branchRepository.save(Branch.builder()
                .application(copy)
                .createdBy(user)
                .name(ApplicationService.DEFAULT_BRANCH_NAME)
                .description("")
                .build());
        copy.setDefaultBranch(branch);

        if (sourceBranch != null) {
            IdMap ids = new IdMap();
            copyDataSources(sourceBranch, branch, ids);
            List<Page> pages = copyPages(sourceBranch, branch, ids);
            Map<Workflow, Workflow> workflows = copyWorkflows(sourceBranch, branch, ids);
            for (Page page : pages) copyComponents(page, ids);
            workflows.forEach((original, workflowCopy) -> copyGraph(original, workflowCopy, ids));
        }
        return applicationRepository.saveAndFlush(copy);
    }

    private void copyDataSources(Branch from, Branch to, IdMap ids) {
        for (DataSource source : dataSourceRepository.findByBranch_IdOrderByNameAsc(from.getId())) {
            DataSource copy = DataSource.builder().name(source.getName()).format(source.getFormat()).branch(to).build();
            Map<DataSourceColumn, DataSourceColumn> columns = new HashMap<>();
            for (DataSourceColumn column : source.getColumns()) {
                DataSourceColumn columnCopy = DataSourceColumn.builder()
                        .dataSource(copy).columnIndex(column.getColumnIndex()).name(column.getName()).build();
                copy.getColumns().add(columnCopy);
                columns.put(column, columnCopy);
            }
            for (DataSourceRow row : source.getRows()) {
                DataSourceRow rowCopy = DataSourceRow.builder().dataSource(copy).rowIndex(row.getRowIndex()).build();
                for (DataSourceCell cell : row.getCells()) {
                    rowCopy.getCells().add(DataSourceCell.builder()
                            .row(rowCopy).column(columns.get(cell.getColumn())).value(cell.getValue()).build());
                }
                copy.getRows().add(rowCopy);
            }
            ids.dataSources.put(source.getId().id(), dataSourceRepository.save(copy).getId().id());
        }
    }

    /** The source pages (their copies are made and mapped). */
    private List<Page> copyPages(Branch from, Branch to, IdMap ids) {
        List<Page> pages = pageRepository.findByBranch_Id(from.getId()).stream()
                .sorted(Comparator.comparing(p -> p.getId().id()))
                .toList();
        for (Page page : pages) {
            Page copy = pageRepository.save(Page.builder()
                    .name(page.getName()).path(page.getPath()).layout(page.isLayout()).branch(to).build());
            ids.pages.put(page.getId().id(), copy.getId().id());
        }
        return pages;
    }

    /** Source workflow → its copy. */
    private Map<Workflow, Workflow> copyWorkflows(Branch from, Branch to, IdMap ids) {
        Map<Workflow, Workflow> copies = new LinkedHashMap<>();
        List<Workflow> workflows = workflowRepository.findByBranch_Id(from.getId()).stream()
                .sorted(Comparator.comparing(w -> w.getId().id()))
                .toList();
        for (Workflow workflow : workflows) {
            Page page = workflow.getPage() != null ? pageRef(ids.pages.get(workflow.getPage().getId().id())) : null;
            Workflow copy = workflowRepository.save(Workflow.builder()
                    .name(workflow.getName()).status(workflow.getStatus()).branch(to).page(page).build());
            ids.workflows.put(workflow.getId().id(), copy.getId().id());
            copies.put(workflow, copy);
        }
        return copies;
    }

    /** The page's widgets, parents before their children. */
    private void copyComponents(Page sourcePage, IdMap ids) {
        Page page = pageRef(ids.pages.get(sourcePage.getId().id()));
        List<UiComponent> pending = new ArrayList<>(componentRepository.findByPage_Id(sourcePage.getId()));
        pending.sort(Comparator.comparing(c -> c.getId().id()));
        while (!pending.isEmpty()) {
            int before = pending.size();
            for (Iterator<UiComponent> it = pending.iterator(); it.hasNext(); ) {
                UiComponent component = it.next();
                Long parentId = component.getParent() != null ? component.getParent().getId().id() : null;
                if (parentId != null && !ids.components.containsKey(parentId)) continue;
                ids.components.put(component.getId().id(), copyComponent(component, page, parentId, ids));
                it.remove();
            }
            if (pending.size() == before) {
                throw new IllegalStateException("Widgets of page " + sourcePage.getId().id() + " have parents on another page");
            }
        }
    }

    private Long copyComponent(UiComponent component, Page page, Long parentId, IdMap ids) {
        UiComponent copy = UiComponent.builder()
                .page(page)
                .type(component.getType())
                .parent(parentId != null ? componentRepository.getReferenceById(new UiComponent.UiComponentId(ids.components.get(parentId))) : null)
                .workflow(component.getWorkflow() != null ? workflowRef(ids.workflows.get(component.getWorkflow().getId().id())) : null)
                .x(component.getX()).y(component.getY()).w(component.getW()).h(component.getH())
                .build();
        Map<String, String> propTypes = propTypesOf(component.getType());
        for (UiComponentProperty property : component.getProperties()) {
            UiComponentProperty propertyCopy = new UiComponentProperty();
            propertyCopy.setComponent(copy);
            propertyCopy.setPropKey(property.getPropKey());
            propertyCopy.setPropValue(rewriteProp(propTypes.get(property.getPropKey()), property.getPropValue(), ids));
            copy.getProperties().add(propertyCopy);
        }
        return componentRepository.save(copy).getId().id();
    }

    private void copyGraph(Workflow source, Workflow copy, IdMap ids) {
        Map<Long, Node> nodes = new HashMap<>();
        List<Node> sourceNodes = nodeRepository.findNodesByWorkflow_Id(source.getId()).stream()
                .sorted(Comparator.comparing(n -> n.getId().id()))
                .toList();
        for (Node node : sourceNodes) {
            nodes.put(node.getId().id(), nodeRepository.save(Node.builder()
                    .workflow(copy).type(node.getType()).x(node.getX()).y(node.getY())
                    .props(rewriteNodeProps(node.getProps(), ids))
                    .build()));
        }
        for (Edge edge : edgeRepository.findBySourceNode_Workflow_Id(source.getId())) {
            Node from = nodes.get(edge.getSourceNode().getId().id());
            Node to = nodes.get(edge.getTargetNode().getId().id());
            if (from == null || to == null) continue; // an edge into another workflow: not part of this one
            edgeRepository.save(Edge.builder().sourceNode(from).targetNode(to).sourcePort(edge.getSourcePort()).build());
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
        if (propType == null || value == null || value.isBlank()) return value;
        return switch (propType) {
            case "page" -> mapId(value, ids.pages);
            case "dataSource" -> mapId(value, ids.dataSources);
            case "pages" -> mapIdArray(value, ids.pages);
            default -> value;
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
            if (NODE_WIDGET_KEYS.contains(key)) return mapId(value.toString(), ids.components);
            if (NODE_PAGE_KEYS.contains(key)) return mapId(value.toString(), ids.pages);
            return value;
        });
        return copy;
    }

    /** The copy's id for {@code value}; a non-numeric value (e.g. "all") stays, an unknown id is cleared. */
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

    private Workflow workflowRef(Long id) {
        return id == null ? null : workflowRepository.getReferenceById(new Workflow.WorkflowId(id));
    }
}
