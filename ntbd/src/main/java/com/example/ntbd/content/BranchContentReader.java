package com.example.ntbd.content;

import com.example.ntbd.content.BranchContent.*;
import com.example.ntbd.domain.*;
import com.example.ntbd.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

/** Reads a branch's {@link BranchContent} from the database (soft-deleted things are left out). Call within a transaction. */
@RequiredArgsConstructor
@Component
public class BranchContentReader {

    private final PageRepository pageRepository;
    private final UiComponentRepository componentRepository;
    private final WorkflowRepository workflowRepository;
    private final NodeRepository nodeRepository;
    private final EdgeRepository edgeRepository;
    private final DataSourceRepository dataSourceRepository;
    private final BranchRepository branchRepository;

    public BranchContent read(Long branchId) {
        Branch.BranchId branch = new Branch.BranchId(branchId);
        List<VariableDefinition> variables = branchRepository.findById(branch).map(Branch::getVariables).orElse(List.of());
        List<PageContent> pages = pageRepository.findByBranch_Id(branch).stream()
                .sorted(Comparator.comparing(p -> p.getId().id()))
                .map(this::page)
                .toList();
        List<WorkflowContent> workflows = workflowRepository.findByBranch_Id(branch).stream()
                .sorted(Comparator.comparing(w -> w.getId().id()))
                .map(this::workflow)
                .toList();
        List<DataSourceContent> dataSources = dataSourceRepository.findByBranch_IdOrderByNameAsc(branch).stream()
                .map(BranchContentReader::dataSource)
                .toList();
        return new BranchContent(pages, workflows, dataSources, variables);
    }

    private PageContent page(Page page) {
        List<WidgetContent> widgets = componentRepository.findByPage_Id(page.getId()).stream()
                .sorted(Comparator.comparing(c -> c.getId().id()))
                .map(BranchContentReader::widget)
                .toList();
        return new PageContent(page.getId().id(), page.getName(), page.getPath(), page.isLayout(), widgets, page.getVariables());
    }

    private static WidgetContent widget(UiComponent component) {
        Map<String, String> props = new LinkedHashMap<>();
        component.getProperties().stream()
                .sorted(Comparator.comparing(UiComponentProperty::getPropKey))
                .forEach(property -> props.putIfAbsent(property.getPropKey(), property.getPropValue()));
        return new WidgetContent(component.getId().id(),
                component.getParent() != null ? component.getParent().getId().id() : null,
                component.getWorkflow() != null ? component.getWorkflow().getId().id() : null,
                component.getType(), component.getX(), component.getY(), component.getW(), component.getH(), props);
    }

    private WorkflowContent workflow(Workflow workflow) {
        List<NodeContent> nodes = nodeRepository.findNodesByWorkflow_Id(workflow.getId()).stream()
                .sorted(Comparator.comparing(n -> n.getId().id()))
                .map(n -> new NodeContent(n.getId().id(), n.getType(), n.getX(), n.getY(), n.getProps()))
                .toList();
        Set<Long> nodeIds = new HashSet<>();
        nodes.forEach(n -> nodeIds.add(n.id()));
        List<EdgeContent> edges = edgeRepository.findBySourceNode_Workflow_Id(workflow.getId()).stream()
                .sorted(Comparator.comparing(e -> e.getId().id()))
                .map(e -> new EdgeContent(e.getId().id(), e.getSourceNode().getId().id(), e.getSourcePort(), e.getTargetNode().getId().id()))
                // An edge into another workflow isn't part of this one
                .filter(e -> nodeIds.contains(e.targetNodeId()))
                .toList();
        return new WorkflowContent(workflow.getId().id(), workflow.getName(), workflow.getStatus(),
                workflow.getPage() != null ? workflow.getPage().getId().id() : null, nodes, edges);
    }

    private static DataSourceContent dataSource(DataSource source) {
        List<String> columns = source.getColumns().stream().map(DataSourceColumn::getName).toList();
        List<List<String>> rows = source.getRows().stream().map(row -> {
            List<String> values = new ArrayList<>(Collections.nCopies(columns.size(), (String) null));
            for (DataSourceCell cell : row.getCells()) {
                int index = cell.getColumn().getColumnIndex();
                if (index >= 0 && index < columns.size()) values.set(index, cell.getValue());
            }
            return values;
        }).toList();
        return new DataSourceContent(source.getId().id(), source.getName(), source.getFormat(), columns, rows);
    }
}
