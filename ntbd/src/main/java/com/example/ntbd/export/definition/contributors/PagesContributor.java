package com.example.ntbd.export.definition.contributors;

import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.dto.EdgeDto;
import com.example.ntbd.dto.NodeDto;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionContributor;
import com.example.ntbd.export.definition.ExportScope;
import com.example.ntbd.service.EdgeService;
import com.example.ntbd.service.NodeService;
import com.example.ntbd.service.PageService;
import com.example.ntbd.service.UiComponentService;
import com.example.ntbd.service.WorkflowService;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * The app's pages: each with its widgets (as a tree, props completed with their type's defaults
 * from the widget catalog) and its workflow. Sections "homePageId" and "pages".
 */
@Component
@Order(100)
@RequiredArgsConstructor
public class PagesContributor implements AppDefinitionContributor {

    private final PageService pageService;
    private final UiComponentService uiComponentService;
    private final WorkflowService workflowService;
    private final NodeService nodeService;
    private final EdgeService edgeService;
    private final WidgetCatalog widgetCatalog;

    @Override
    public void contribute(ExportScope scope, AppDefinition definition) {
        List<PageDefinition> pages = pageService.findByBranchId(scope.branchId()).stream()
                .sorted(Comparator.comparing(PageDto::id))
                .map(this::page)
                .toList();
        // No home page setting yet: the exported app starts on the page at "/", or else the first one
        definition.put("homePageId", null);
        definition.put("pages", pages);
    }

    private PageDefinition page(PageDto page) {
        return new PageDefinition(
                page.id(),
                Objects.requireNonNullElse(page.name(), ""),
                Objects.requireNonNullElse(page.path(), ""),
                page.layout(),
                components(page.id()),
                workflow(page.id()));
    }

    private List<ComponentDefinition> components(Long pageId) {
        List<UiComponentDto> all = uiComponentService.findByPageId(pageId);
        Map<Long, List<UiComponentDto>> byParent = all.stream()
                .filter(c -> c.parentId() != null)
                .collect(Collectors.groupingBy(UiComponentDto::parentId));
        return all.stream()
                .filter(c -> c.parentId() == null)
                .sorted(Comparator.comparing(UiComponentDto::id))
                .map(c -> component(c, byParent))
                .toList();
    }

    private ComponentDefinition component(UiComponentDto c, Map<Long, List<UiComponentDto>> byParent) {
        Map<String, Object> props = new LinkedHashMap<>(widgetCatalog.defaultsOf(c.type()));
        if (c.props() != null) props.putAll(c.props());

        List<ComponentDefinition> children = byParent.getOrDefault(c.id(), List.of()).stream()
                .sorted(Comparator.comparing(UiComponentDto::id))
                .map(child -> component(child, byParent))
                .toList();
        return new ComponentDefinition(c.id(), c.parentId(), c.type(), c.x(), c.y(), c.w(), c.h(), props,
                children.isEmpty() ? null : children);
    }

    private WorkflowDefinition workflow(Long pageId) {
        return workflowService.findForPage(pageId)
                .map(workflow -> new WorkflowDefinition(
                        nodeService.findByWorkflowId(workflow.id()).stream()
                                .sorted(Comparator.comparing(NodeDto::id))
                                .map(n -> new NodeDefinition(n.id(), n.type(), n.x(), n.y(),
                                        n.props() != null ? n.props() : Map.of()))
                                .toList(),
                        edgeService.findByWorkflowId(workflow.id()).stream()
                                .sorted(Comparator.comparing(EdgeDto::id))
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
