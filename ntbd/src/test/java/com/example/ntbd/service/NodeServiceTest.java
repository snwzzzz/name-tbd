package com.example.ntbd.service;

import com.example.ntbd.Exception.NodeNotFoundException;
import com.example.ntbd.Exception.WorkflowNotFoundException;
import com.example.ntbd.commands.NewNodeCommand;
import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import com.example.ntbd.dto.NodeDto;
import com.example.ntbd.persistence.NodeRepository;
import com.example.ntbd.persistence.WorkflowRepository;
import com.example.ntbd.workflow.validation.NodeConfigValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class NodeServiceTest {

    @Mock
    private NodeRepository nodeRepository;

    @Mock
    private WorkflowRepository workflowRepository;

    @Mock
    private NodeConfigValidator nodeConfigValidator;

    private NodeService nodeService;

    @BeforeEach
    void setUp() {
        nodeService = new NodeService(nodeRepository, workflowRepository, nodeConfigValidator);
    }

    // ---- createNode ----

    @Test
    void createNode_validates_props_before_saving() {
        var workflow = Workflow.builder()
                .id(new Workflow.WorkflowId(1L))
                .name("W").status(WorkflowStatus.ACTIVE).build();
        var command = new NewNodeCommand(1L, "CONDITION",
                Map.of("field", "status", "operator", "eq", "value", "active"), 0.0, 0.0);

        when(workflowRepository.findById(new Workflow.WorkflowId(1L))).thenReturn(Optional.of(workflow));
        when(nodeRepository.saveAndFlush(any(Node.class))).thenAnswer(inv -> {
            Node n = inv.getArgument(0);
            return Node.builder()
                    .id(new Node.NodeId(10L))
                    .type(n.getType())
                    .props(n.getProps())
                    .workflow(n.getWorkflow())
                    .build();
        });

        NodeDto dto = nodeService.createNode(command);

        // Validator MUST be called before repository save
        var order = inOrder(nodeConfigValidator, nodeRepository);
        order.verify(nodeConfigValidator).validate(any(Node.class));
        order.verify(nodeRepository).saveAndFlush(any(Node.class));

        assertThat(dto.type()).isEqualTo("CONDITION");
        assertThat(dto.workflowId()).isEqualTo(1L);
    }

    @Test
    void createNode_throws_when_validator_rejects_props() {
        var workflow = Workflow.builder()
                .id(new Workflow.WorkflowId(1L))
                .name("W").status(WorkflowStatus.ACTIVE).build();
        var command = new NewNodeCommand(1L, "CONDITION", Map.of("field", "status"), 0.0, 0.0); // missing operator/value

        when(workflowRepository.findById(new Workflow.WorkflowId(1L))).thenReturn(Optional.of(workflow));
        doThrow(new IllegalArgumentException("Invalid node configuration: operator must not be blank"))
                .when(nodeConfigValidator).validate(any(Node.class));

        assertThatThrownBy(() -> nodeService.createNode(command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("operator");

        verify(nodeRepository, never()).saveAndFlush(any());
    }

    @Test
    void createNode_throws_when_workflow_not_found() {
        var command = new NewNodeCommand(99L, "CONDITION", Map.of(), 0.0, 0.0);
        when(workflowRepository.findById(new Workflow.WorkflowId(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> nodeService.createNode(command))
                .isInstanceOf(WorkflowNotFoundException.class)
                .hasMessageContaining("99");

        verifyNoInteractions(nodeRepository);
    }

    @Test
    void createNode_stores_correct_type_and_props() {
        var workflow = Workflow.builder()
                .id(new Workflow.WorkflowId(1L))
                .name("W").status(WorkflowStatus.ACTIVE).build();
        var props = Map.<String, Object>of("url", "http://example.com");
        var command = new NewNodeCommand(1L, "WEBHOOK", props, 0.0, 0.0);

        when(workflowRepository.findById(new Workflow.WorkflowId(1L))).thenReturn(Optional.of(workflow));
        when(nodeRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        nodeService.createNode(command);

        ArgumentCaptor<Node> captor = ArgumentCaptor.forClass(Node.class);
        verify(nodeRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo("WEBHOOK");
        assertThat(captor.getValue().getProps().get("url")).isEqualTo("http://example.com");
    }

    // ---- findById ----

    @Test
    void findById_returns_dto_when_found() {
        var node = Node.builder()
                .id(new Node.NodeId(5L))
                .type("CONDITION")
                .props(Map.of())
                .workflow(Workflow.builder().id(new Workflow.WorkflowId(1L)).build())
                .build();
        when(nodeRepository.findById(new Node.NodeId(5L))).thenReturn(Optional.of(node));

        NodeDto dto = nodeService.findById(5L);

        assertThat(dto.id()).isEqualTo(5L);
        assertThat(dto.type()).isEqualTo("CONDITION");
    }

    @Test
    void findById_throws_when_not_found() {
        when(nodeRepository.findById(new Node.NodeId(99L))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> nodeService.findById(99L))
                .isInstanceOf(NodeNotFoundException.class)
                .hasMessageContaining("99");
    }

    // ---- findByWorkflowId ----

    @Test
    void findByWorkflowId_returns_all_nodes_for_workflow() {
        var workflow = Workflow.builder().id(new Workflow.WorkflowId(1L)).build();
        var n1 = Node.builder().id(new Node.NodeId(1L)).type("CONDITION").props(Map.of()).workflow(workflow).build();
        var n2 = Node.builder().id(new Node.NodeId(2L)).type("WEBHOOK").props(Map.of()).workflow(workflow).build();
        when(nodeRepository.findNodesByWorkflow_Id(new Workflow.WorkflowId(1L))).thenReturn(List.of(n1, n2));

        List<NodeDto> dtos = nodeService.findByWorkflowId(1L);

        assertThat(dtos.size()).isEqualTo(2);
        assertThat(dtos.get(0).type()).isEqualTo("CONDITION");
        assertThat(dtos.get(1).type()).isEqualTo("WEBHOOK");
    }

    // ---- deleteNode ----

    @Test
    void deleteNode_deletes_when_exists() {
        when(nodeRepository.existsById(new Node.NodeId(5L))).thenReturn(true);

        nodeService.deleteNode(5L);

        verify(nodeRepository).deleteById(new Node.NodeId(5L));
    }

    @Test
    void deleteNode_throws_when_not_found() {
        when(nodeRepository.existsById(new Node.NodeId(99L))).thenReturn(false);

        assertThatThrownBy(() -> nodeService.deleteNode(99L))
                .isInstanceOf(NodeNotFoundException.class)
                .hasMessageContaining("99");

        verify(nodeRepository, never()).deleteById(any());
    }
}
