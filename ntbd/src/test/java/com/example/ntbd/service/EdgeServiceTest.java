package com.example.ntbd.service;

import com.example.ntbd.Exception.EdgeNotFoundException;
import com.example.ntbd.Exception.NodeNotFoundException;
import com.example.ntbd.commands.NewEdgeCommand;
import com.example.ntbd.domain.Edge;
import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.dto.EdgeDto;
import com.example.ntbd.persistence.EdgeRepository;
import com.example.ntbd.persistence.NodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class EdgeServiceTest {

    @Mock
    private EdgeRepository edgeRepository;

    @Mock
    private NodeRepository nodeRepository;

    private EdgeService edgeService;

    private final Workflow workflow = Workflow.builder()
            .id(new Workflow.WorkflowId(1L))
            .name("W").status(WorkflowStatus.ACTIVE).build();

    private final Node sourceNode = Node.builder()
            .id(new Node.NodeId(1L)).type("CONDITION").props(Map.of()).workflow(workflow).build();

    private final Node targetNode = Node.builder()
            .id(new Node.NodeId(2L)).type("WEBHOOK").props(Map.of()).workflow(workflow).build();

    @BeforeEach
    void setUp() {
        edgeService = new EdgeService(edgeRepository, nodeRepository);
    }

    // ---- createEdge ----

    @Test
    void createEdge_saves_edge_and_returns_dto() {
        var command = new NewEdgeCommand(1L, 2L, "output_true");

        when(nodeRepository.findById(new Node.NodeId(1L))).thenReturn(Optional.of(sourceNode));
        when(nodeRepository.findById(new Node.NodeId(2L))).thenReturn(Optional.of(targetNode));
        when(edgeRepository.saveAndFlush(any(Edge.class))).thenAnswer(inv -> {
            Edge e = inv.getArgument(0);
            return Edge.builder()
                    .id(new Edge.EdgeId(10L))
                    .sourceNode(e.getSourceNode())
                    .targetNode(e.getTargetNode())
                    .sourcePort(e.getSourcePort())
                    .build();
        });

        EdgeDto dto = edgeService.createEdge(command);

        assertThat(dto).isNotNull();
        assertThat(dto.id()).isEqualTo(10L);
        assertThat(dto.sourceNodeId()).isEqualTo(1L);
        assertThat(dto.targetNodeId()).isEqualTo(2L);
        assertThat(dto.sourcePort()).isEqualTo("output_true");
    }

    @Test
    void createEdge_stores_correct_source_and_target_nodes() {
        var command = new NewEdgeCommand(1L, 2L, "output_false");

        when(nodeRepository.findById(new Node.NodeId(1L))).thenReturn(Optional.of(sourceNode));
        when(nodeRepository.findById(new Node.NodeId(2L))).thenReturn(Optional.of(targetNode));
        when(edgeRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        edgeService.createEdge(command);

        ArgumentCaptor<Edge> captor = ArgumentCaptor.forClass(Edge.class);
        verify(edgeRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getSourceNode()).isSameAs(sourceNode);
        assertThat(captor.getValue().getTargetNode()).isSameAs(targetNode);
        assertThat(captor.getValue().getSourcePort()).isEqualTo("output_false");
    }

    @Test
    void createEdge_throws_when_source_node_not_found() {
        var command = new NewEdgeCommand(99L, 2L, "output_true");
        when(nodeRepository.findById(new Node.NodeId(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> edgeService.createEdge(command))
                .isInstanceOf(NodeNotFoundException.class)
                .hasMessageContaining("99");

        verifyNoInteractions(edgeRepository);
    }

    @Test
    void createEdge_throws_when_target_node_not_found() {
        var command = new NewEdgeCommand(1L, 99L, "output_true");
        when(nodeRepository.findById(new Node.NodeId(1L))).thenReturn(Optional.of(sourceNode));
        when(nodeRepository.findById(new Node.NodeId(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> edgeService.createEdge(command))
                .isInstanceOf(NodeNotFoundException.class)
                .hasMessageContaining("99");

        verifyNoInteractions(edgeRepository);
    }

    // ---- findByWorkflowId ----

    @Test
    void findByWorkflowId_returns_edges_of_workflow() {
        var edge = Edge.builder()
                .id(new Edge.EdgeId(5L))
                .sourceNode(sourceNode)
                .targetNode(targetNode)
                .sourcePort("out")
                .build();
        when(edgeRepository.findBySourceNode_Workflow_Id(new Workflow.WorkflowId(1L))).thenReturn(java.util.List.of(edge));

        var dtos = edgeService.findByWorkflowId(1L);

        assertThat(dtos.size()).isEqualTo(1);
        assertThat(dtos.get(0).sourceNodeId()).isEqualTo(1L);
        assertThat(dtos.get(0).targetNodeId()).isEqualTo(2L);
        assertThat(dtos.get(0).sourcePort()).isEqualTo("out");
    }

    // ---- findById ----

    @Test
    void findById_returns_dto_when_found() {
        var edge = Edge.builder()
                .id(new Edge.EdgeId(5L))
                .sourceNode(sourceNode)
                .targetNode(targetNode)
                .sourcePort("output_true")
                .build();
        when(edgeRepository.findById(new Edge.EdgeId(5L))).thenReturn(Optional.of(edge));

        EdgeDto dto = edgeService.findById(5L);

        assertThat(dto.id()).isEqualTo(5L);
        assertThat(dto.sourcePort()).isEqualTo("output_true");
    }

    @Test
    void findById_throws_when_not_found() {
        when(edgeRepository.findById(new Edge.EdgeId(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> edgeService.findById(99L))
                .isInstanceOf(EdgeNotFoundException.class)
                .hasMessageContaining("99");
    }

    // ---- deleteEdge ----

    @Test
    void deleteEdge_deletes_when_exists() {
        when(edgeRepository.existsById(new Edge.EdgeId(5L))).thenReturn(true);

        edgeService.deleteEdge(5L);

        verify(edgeRepository).deleteById(new Edge.EdgeId(5L));
    }

    @Test
    void deleteEdge_throws_when_not_found() {
        when(edgeRepository.existsById(new Edge.EdgeId(99L))).thenReturn(false);

        assertThatThrownBy(() -> edgeService.deleteEdge(99L))
                .isInstanceOf(EdgeNotFoundException.class)
                .hasMessageContaining("99");

        verify(edgeRepository, never()).deleteById(any());
    }
}
