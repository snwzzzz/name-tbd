package com.example.ntbd.dto;

import java.util.List;

/**
 * Everything the editor shows of a page, in one answer: the page, its widgets (each with its type's
 * default props overlaid with its own) and its workflow.
 */
public record PageContentDto(
        PageDto page,
        List<UiComponentDto> components,
        PageWorkflowDto workflow
) {
    /** A page's workflow with its nodes and edges. */
    public record PageWorkflowDto(Long id, List<NodeDto> nodes, List<EdgeDto> edges) {}
}
