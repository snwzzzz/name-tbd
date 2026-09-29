package com.example.ntbd.mapper;

import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.dto.NodeDto;

public class NodeMapper {

    public static NodeDto toDto(Node node) {
        if (node == null) return null;

        Long workflowId = null;
        if (node.getWorkflow() != null && node.getWorkflow().getId() != null) {
            workflowId = node.getWorkflow().getId().id();
        }

        return new NodeDto(
                node.getId() != null ? node.getId().id() : null,
                workflowId,
                node.getType(),
                node.getProps(),
                node.getX(),
                node.getY(),
                node.getCreatedAt(),
                node.getLastModified()
        );
    }

    public static Node toEntity(NodeDto dto) {
        if (dto == null) return null;

        Node node = Node.builder()
                .id(dto.id() != null ? new Node.NodeId(dto.id()) : null)
                .type(dto.type())
                .props(dto.props())
                .x(dto.x())
                .y(dto.y())
                .workflow(dto.workflowId() != null
                        ? Workflow.builder().id(new Workflow.WorkflowId(dto.workflowId())).build()
                        : null)
                .build();
        node.setCreatedAt(dto.createdAt());
        node.setLastModified(dto.lastModified());
        return node;
    }
}
