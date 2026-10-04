package com.example.ntbd.export.definition.contributors;

import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.content.BranchContent.EdgeContent;
import com.example.ntbd.content.BranchContent.NodeContent;
import com.example.ntbd.content.BranchContent.PageContent;
import com.example.ntbd.content.BranchContent.WidgetContent;
import com.example.ntbd.content.BranchContent.WorkflowContent;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionContributor;
import com.example.ntbd.export.definition.ExportScope;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * The app's pages: each with its widgets (as a tree, props completed with their type's defaults
 * from the widget catalog) and its workflow. Sections "homePageId" and "pages".
 */
@Component
@Order(100)
@RequiredArgsConstructor
public class PagesContributor implements AppDefinitionContributor {

    private final WidgetCatalog widgetCatalog;

    @Override
    public void contribute(ExportScope scope, AppDefinition definition) {
        List<WorkflowContent> workflows = scope.content().workflows();
        List<PageDefinition> pages = scope.content().pages().stream()
                .sorted(Comparator.comparing(PageContent::id))
                .map(page -> page(page, workflows))
                .toList();
        // No home page setting yet: the exported app starts on the page at "/", or else the first one
        definition.put("homePageId", null);
        definition.put("pages", pages);
    }

    private PageDefinition page(PageContent page, List<WorkflowContent> workflows) {
        Optional<WorkflowContent> workflow = workflows.stream()
                .filter(w -> page.id().equals(w.pageId()))
                .min(Comparator.comparing(WorkflowContent::id));
        return new PageDefinition(
                page.id(),
                Objects.requireNonNullElse(page.name(), ""),
                Objects.requireNonNullElse(page.path(), ""),
                page.layout(),
                components(page.widgets()),
                workflow(workflow));
    }

    private List<ComponentDefinition> components(List<WidgetContent> all) {
        Map<Long, List<WidgetContent>> byParent = all.stream()
                .filter(c -> c.parentId() != null)
                .collect(Collectors.groupingBy(WidgetContent::parentId));
        return all.stream()
                .filter(c -> c.parentId() == null)
                .sorted(Comparator.comparing(WidgetContent::id))
                .map(c -> component(c, byParent))
                .toList();
    }

    private ComponentDefinition component(WidgetContent c, Map<Long, List<WidgetContent>> byParent) {
        Map<String, Object> props = new LinkedHashMap<>(widgetCatalog.defaultsOf(c.type()));
        if (c.props() != null) props.putAll(c.props());

        List<ComponentDefinition> children = byParent.getOrDefault(c.id(), List.of()).stream()
                .sorted(Comparator.comparing(WidgetContent::id))
                .map(child -> component(child, byParent))
                .toList();
        return new ComponentDefinition(c.id(), c.parentId(), c.type(), c.x(), c.y(), c.w(), c.h(), props,
                children.isEmpty() ? null : children);
    }

    private WorkflowDefinition workflow(Optional<WorkflowContent> found) {
        return found
                .map(workflow -> new WorkflowDefinition(
                        workflow.nodes().stream()
                                .sorted(Comparator.comparing(NodeContent::id))
                                .map(n -> new NodeDefinition(n.id(), n.type(), n.x(), n.y(),
                                        n.props() != null ? n.props() : Map.of()))
                                .toList(),
                        workflow.edges().stream()
                                .sorted(Comparator.comparing(EdgeContent::id))
                                .map(e -> new EdgeDefinition(e.id(), e.sourceNodeId(),
                                        Objects.requireNonNullElse(e.sourcePort(), "out"), e.targetNodeId()))
                                .toList()))
                .orElseGet(() -> new WorkflowDefinition(List.of(), List.of()));
    }

    public record PageDefinition(Long id, String name, String path, boolean layout,
                                 List<ComponentDefinition> components, WorkflowDefinition workflow) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ComponentDefinition(Long id, Long parentId, String type, Double x, Double y, Double w, Double h,
                                      Map<String, Object> props, List<ComponentDefinition> children) {
    }

    public record WorkflowDefinition(List<NodeDefinition> nodes, List<EdgeDefinition> edges) {
    }

    public record NodeDefinition(Long id, String type, Double x, Double y, Map<String, Object> props) {
    }

    public record EdgeDefinition(Long id, Long sourceNodeId, String sourcePort, Long targetNodeId) {
    }
}
