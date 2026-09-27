package com.example.ntbd.mapper;

import com.example.ntbd.domain.Edge;
import com.example.ntbd.domain.Node;
import com.example.ntbd.dto.EdgeDto;

public class EdgeMapper {

    public static EdgeDto toDto(Edge edge) {
        if (edge == null) return null;

        Long sourceNodeId = null;
        if (edge.getSourceNode() != null && edge.getSourceNode().getId() != null) {
            sourceNodeId = edge.getSourceNode().getId().id();
        }

        Long targetNodeId = null;
        if (edge.getTargetNode() != null && edge.getTargetNode().getId() != null) {
            targetNodeId = edge.getTargetNode().getId().id();
        }

        return new EdgeDto(
                edge.getId() != null ? edge.getId().id() : null,
                sourceNodeId,
                targetNodeId,
                edge.getSourcePort(),
                edge.getCreatedAt(),
                edge.getLastModified()
        );
    }

    public static Edge toEntity(EdgeDto dto) {
        if (dto == null) return null;

        Edge edge = Edge.builder()
                .id(dto.id() != null ? new Edge.EdgeId(dto.id()) : null)
                .sourcePort(dto.sourcePort())
                .sourceNode(dto.sourceNodeId() != null
                        ? Node.builder().id(new Node.NodeId(dto.sourceNodeId())).build()
                        : null)
                .targetNode(dto.targetNodeId() != null
                        ? Node.builder().id(new Node.NodeId(dto.targetNodeId())).build()
                        : null)
                .build();
        edge.setCreatedAt(dto.createdAt());
        edge.setLastModified(dto.lastModified());
        return edge;
    }
}
