package com.example.ntbd.mapper;

import com.example.ntbd.domain.Edge;
import com.example.ntbd.domain.Node;
import com.example.ntbd.dto.EdgeDto;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class EdgeMapperTest {

    @Test
    void maps_edge_to_dto() {
        var sourceNode = Node.builder().id(new Node.NodeId(1L)).build();
        var targetNode = Node.builder().id(new Node.NodeId(2L)).build();
        var edge = Edge.builder()
                .id(new Edge.EdgeId(10L))
                .sourceNode(sourceNode)
                .targetNode(targetNode)
                .sourcePort("output_true")
                .build();

        EdgeDto dto = EdgeMapper.toDto(edge);

        assertNotNull(dto);
        assertEquals(10L, dto.id());
        assertEquals(1L, dto.sourceNodeId());
        assertEquals(2L, dto.targetNodeId());
        assertEquals("output_true", dto.sourcePort());
    }

    @Test
    void maps_dto_to_edge_entity() {
        var dto = new EdgeDto(10L, 1L, 2L, "output_true", null, null);

        Edge edge = EdgeMapper.toEntity(dto);

        assertNotNull(edge);
        assertEquals(10L, edge.getId().id());
        assertEquals(1L, edge.getSourceNode().getId().id());
        assertEquals(2L, edge.getTargetNode().getId().id());
        assertEquals("output_true", edge.getSourcePort());
    }

    @Test
    void handles_null_input() {
        assertNull(EdgeMapper.toDto(null));
        assertNull(EdgeMapper.toEntity(null));
    }

    @Test
    void handles_null_nodes() {
        var edge = Edge.builder()
                .id(new Edge.EdgeId(10L))
                .sourceNode(null)
                .targetNode(null)
                .sourcePort("output")
                .build();

        EdgeDto dto = EdgeMapper.toDto(edge);

        assertNull(dto.sourceNodeId());
        assertNull(dto.targetNodeId());
    }
}
