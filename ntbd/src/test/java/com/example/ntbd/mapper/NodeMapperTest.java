package com.example.ntbd.mapper;

import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.dto.NodeDto;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class NodeMapperTest {

    @Test
    void maps_node_to_dto() {
        var workflow = Workflow.builder().id(new Workflow.WorkflowId(10L)).build();
        var node = Node.builder()
                .id(new Node.NodeId(1L))
                .type("CONDITION")
                .props(Map.of("field", "status", "operator", "eq", "value", "active"))
                .workflow(workflow)
                .build();

        NodeDto dto = NodeMapper.toDto(node);

        assertNotNull(dto);
        assertEquals(1L, dto.id());
        assertEquals("CONDITION", dto.type());
        assertEquals(10L, dto.workflowId());
        assertEquals("status", dto.props().get("field"));
    }

    @Test
    void maps_dto_to_node_entity() {
        var dto = new NodeDto(1L, 10L, "CONDITION", Map.of("field", "status"), 0.0, 0.0, null, null);

        Node node = NodeMapper.toEntity(dto);

        assertNotNull(node);
        assertEquals(1L, node.getId().id());
        assertEquals("CONDITION", node.getType());
        assertEquals(10L, node.getWorkflow().getId().id());
    }

    @Test
    void handles_null_input() {
        assertNull(NodeMapper.toDto(null));
        assertNull(NodeMapper.toEntity(null));
    }

    @Test
    void handles_null_workflow() {
        var node = Node.builder()
                .id(new Node.NodeId(1L))
                .type("CONDITION")
                .props(Map.of())
                .workflow(null)
                .build();

        NodeDto dto = NodeMapper.toDto(node);

        assertNull(dto.workflowId());
    }
}
