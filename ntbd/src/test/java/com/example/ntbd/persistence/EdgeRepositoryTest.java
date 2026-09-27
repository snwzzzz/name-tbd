package com.example.ntbd.persistence;

import com.example.ntbd.domain.Edge;
import com.example.ntbd.domain.Node;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.Map;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class EdgeRepositoryTest {

    @Autowired
    private EdgeRepository edgeRepository;

    @Autowired
    private NodeRepository nodeRepository;

    @Autowired
    private WorkflowRepository workflowRepository;

    @Test
    void can_save() {
        var workflow = workflowRepository.saveAndFlush(
                Workflow.builder().name("Edge Test Workflow").status(WorkflowStatus.DRAFT).build()
        );

        var sourceNode = nodeRepository.saveAndFlush(
                Node.builder().type("condition").props(Map.of("field", "status")).workflow(workflow).build()
        );
        var targetNode = nodeRepository.saveAndFlush(
                Node.builder().type("webhook").props(Map.of("url", "https://example.com")).workflow(workflow).build()
        );

        var edge = Edge.builder()
                .sourceNode(sourceNode)
                .sourcePort("output_true")
                .targetNode(targetNode)
                .build();

        var saved = edgeRepository.saveAndFlush(edge);

        assertThat(edgeRepository.findById(saved.getId())).isNotEmpty();
    }

    @Test
    void find_edges_by_workflow_id() {
        var workflow1 = workflowRepository.saveAndFlush(
                Workflow.builder().name("Workflow 1").status(WorkflowStatus.DRAFT).build()
        );
        var workflow2 = workflowRepository.saveAndFlush(
                Workflow.builder().name("Workflow 2").status(WorkflowStatus.DRAFT).build()
        );

        var node1 = nodeRepository.saveAndFlush(
                Node.builder().type("condition").props(Map.of("field", "a")).workflow(workflow1).build()
        );
        var node2 = nodeRepository.saveAndFlush(
                Node.builder().type("webhook").props(Map.of("url", "https://a.com")).workflow(workflow1).build()
        );
        var node3 = nodeRepository.saveAndFlush(
                Node.builder().type("condition").props(Map.of("field", "b")).workflow(workflow2).build()
        );
        var node4 = nodeRepository.saveAndFlush(
                Node.builder().type("webhook").props(Map.of("url", "https://b.com")).workflow(workflow2).build()
        );

        edgeRepository.saveAndFlush(
                Edge.builder().sourceNode(node1).sourcePort("output_true").targetNode(node2).build()
        );
        edgeRepository.saveAndFlush(
                Edge.builder().sourceNode(node3).sourcePort("output_true").targetNode(node4).build()
        );

        // Since we dropped workflow from Edge, we can query by sourceNode.workflow.id instead.
        var workflow1Edges = edgeRepository.findBySourceNode_Workflow_Id(workflow1.getId());
        assertThat((long) workflow1Edges.size()).isEqualTo(1);
    }

    @Test
    void find_by_source_node_and_port() {
        var workflow = workflowRepository.saveAndFlush(
                Workflow.builder().name("Port Lookup Workflow").status(WorkflowStatus.DRAFT).build()
        );

        var conditionNode = nodeRepository.saveAndFlush(
                Node.builder().type("condition").props(Map.of("field", "status")).workflow(workflow).build()
        );
        var trueTarget = nodeRepository.saveAndFlush(
                Node.builder().type("webhook").props(Map.of("url", "https://true.com")).workflow(workflow).build()
        );
        var falseTarget = nodeRepository.saveAndFlush(
                Node.builder().type("webhook").props(Map.of("url", "https://false.com")).workflow(workflow).build()
        );

        edgeRepository.saveAndFlush(
                Edge.builder().sourceNode(conditionNode).sourcePort("output_true").targetNode(trueTarget).build()
        );
        edgeRepository.saveAndFlush(
                Edge.builder().sourceNode(conditionNode).sourcePort("output_false").targetNode(falseTarget).build()
        );

        var trueEdge = edgeRepository.findBySourceNode_IdAndSourcePort(conditionNode.getId(), "output_true");
        assertThat(trueEdge).isNotEmpty();
        assertThat(trueEdge.get().getTargetNode().getId()).isEqualTo(trueTarget.getId());

        var falseEdge = edgeRepository.findBySourceNode_IdAndSourcePort(conditionNode.getId(), "output_false");
        assertThat(falseEdge).isNotEmpty();
        assertThat(falseEdge.get().getTargetNode().getId()).isEqualTo(falseTarget.getId());
    }
}
