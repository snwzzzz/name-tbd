package com.example.ntbd.content;

import com.example.ntbd.domain.WorkflowStatus;

import java.util.List;
import java.util.Map;

/**
 * Everything in a branch, as stored: its pages with their widgets (props as stored, without the
 * catalog's defaults), its workflows with their nodes and edges, and its data sources with their rows.
 * <p>
 * Read by {@link BranchContentReader}, written into a branch by {@link BranchContentWriter} (with new
 * ids). Duplicating an app, the export and version snapshots all go through it. Lists are ordered
 * (pages, widgets, workflows, nodes and edges by id; data sources by name), so the same branch always
 * reads the same. Ids are the branch's own; they only relate the parts to each other.
 *
 * @param format the shape of this record, stored with snapshots; bumped on changes that need a migration
 */
public record BranchContent(int format, List<PageContent> pages, List<WorkflowContent> workflows,
                            List<DataSourceContent> dataSources) {

    public static final int FORMAT = 1;

    public BranchContent(List<PageContent> pages, List<WorkflowContent> workflows, List<DataSourceContent> dataSources) {
        this(FORMAT, pages, workflows, dataSources);
    }

    /** A page and its widgets (a flat list; a widget's parent is on the same page). */
    public record PageContent(Long id, String name, String path, boolean layout, List<WidgetContent> widgets) {
    }

    /** A widget; {@code props} are its stored values (strings, as the properties table keeps them). */
    public record WidgetContent(Long id, Long parentId, Long workflowId, String type,
                                Double x, Double y, Double w, Double h, Map<String, String> props) {
    }

    /** A workflow: a page's (pageId), or one of the branch's own. */
    public record WorkflowContent(Long id, String name, WorkflowStatus status, Long pageId,
                                  List<NodeContent> nodes, List<EdgeContent> edges) {
    }

    public record NodeContent(Long id, String type, Double x, Double y, Map<String, Object> props) {
    }

    /** An edge between two nodes of the same workflow. */
    public record EdgeContent(Long id, Long sourceNodeId, String sourcePort, Long targetNodeId) {
    }

    /** A data source; each row has a value per column, null where it has no cell. */
    public record DataSourceContent(Long id, String name, String format, List<String> columns, List<List<String>> rows) {
    }
}
