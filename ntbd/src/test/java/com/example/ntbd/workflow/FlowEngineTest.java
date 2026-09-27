package com.example.ntbd.workflow;

import com.example.ntbd.domain.Edge;
import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.persistence.EdgeRepository;
import com.example.ntbd.persistence.WorkflowRepository;
import com.example.ntbd.workflow.handlers.ConditionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class FlowEngineTest {

    private WorkflowRepository workflowRepository;
    private EdgeRepository edgeRepository;
    private NodeHandlerRegistry registry;
    private FlowEngine flowEngine;

    @BeforeEach
    void setUp() {
        workflowRepository = mock(WorkflowRepository.class);
        edgeRepository = mock(EdgeRepository.class);
        registry = mock(NodeHandlerRegistry.class);
        flowEngine = new FlowEngine(workflowRepository, edgeRepository, registry);
    }

    @Test
    void executes_workflow_successfully() {
        var node1 = Node.builder().id(new Node.NodeId(1L)).type("START").props(Map.of()).build();
        var node2 = Node.builder().id(new Node.NodeId(2L)).type("END").props(Map.of()).build();
        var edge = Edge.builder().sourceNode(node1).sourcePort("output").targetNode(node2).build();

        var workflow = Workflow.builder()
                .id(new Workflow.WorkflowId(10L))
                .status(WorkflowStatus.ACTIVE)
                .nodes(List.of(node1, node2))
                .build();

        when(workflowRepository.findById(new Workflow.WorkflowId(10L))).thenReturn(Optional.of(workflow));
        when(edgeRepository.findBySourceNode_Workflow_Id(new Workflow.WorkflowId(10L))).thenReturn(List.of(edge));
        
        NodeHandler startHandler = mock(NodeHandler.class);
        when(startHandler.handle(eq(node1), any())).thenReturn(ExecutionResult.success("output", null));
        when(registry.getHandler("START")).thenReturn(startHandler);

        NodeHandler endHandler = mock(NodeHandler.class);
        when(endHandler.handle(eq(node2), any())).thenReturn(ExecutionResult.success(null, null));
        when(registry.getHandler("END")).thenReturn(endHandler);

        flowEngine.executeWorkflow(10L, Map.of());

        assertThat(workflow.getStatus()).isEqualTo(WorkflowStatus.COMPLETED);
        verify(workflowRepository, atLeastOnce()).save(workflow);
    }

    @Test
    void fails_workflow_when_node_fails() {
        var node1 = Node.builder().id(new Node.NodeId(1L)).type("START").props(Map.of()).build();
        var workflow = Workflow.builder()
                .id(new Workflow.WorkflowId(10L))
                .status(WorkflowStatus.ACTIVE)
                .nodes(List.of(node1))
                .build();

        when(workflowRepository.findById(new Workflow.WorkflowId(10L))).thenReturn(Optional.of(workflow));
        when(edgeRepository.findBySourceNode_Workflow_Id(new Workflow.WorkflowId(10L))).thenReturn(List.of());

        NodeHandler startHandler = mock(NodeHandler.class);
        when(startHandler.handle(eq(node1), any())).thenReturn(ExecutionResult.failure("Simulated failure"));
        when(registry.getHandler("START")).thenReturn(startHandler);

        flowEngine.executeWorkflow(10L, Map.of());

        assertThat(workflow.getStatus()).isEqualTo(WorkflowStatus.FAILED);
    }
}
