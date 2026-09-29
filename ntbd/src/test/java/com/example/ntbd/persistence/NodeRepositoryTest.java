package com.example.ntbd.persistence;

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
public class NodeRepositoryTest {

    @Autowired
    private NodeRepository nodeRepository;

    @Autowired
    private WorkflowRepository workflowRepository;

    @Test
    void can_save() {
        var workflow = workflowRepository.saveAndFlush(
                Workflow.builder().name("My Workflow").status(WorkflowStatus.DRAFT).build()
        );

        var node = Node.builder()
                .type("condition")
                .props(Map.of("field", "status", "operator", "eq", "value", "active"))
                .workflow(workflow)
                .build();

        var saved = nodeRepository.saveAndFlush(node);

        assertThat(nodeRepository.findById(saved.getId())).isNotEmpty();
    }

    @Test
    void find_nodes_by_workflow_id() {
        var workflow1 = workflowRepository.saveAndFlush(
                Workflow.builder().name("Workflow 1").status(WorkflowStatus.DRAFT).build()
        );
        var workflow2 = workflowRepository.saveAndFlush(
                Workflow.builder().name("Workflow 2").status(WorkflowStatus.DRAFT).build()
        );

        nodeRepository.saveAndFlush(
                Node.builder().type("condition").props(Map.of("field", "x")).workflow(workflow1).build()
        );
        nodeRepository.saveAndFlush(
                Node.builder().type("webhook").props(Map.of("url", "https://example.com")).workflow(workflow1).build()
        );
        nodeRepository.saveAndFlush(
                Node.builder().type("condition").props(Map.of("field", "y")).workflow(workflow2).build()
        );

        var workflow1Nodes = nodeRepository.findNodesByWorkflow_Id(workflow1.getId());

        assertThat((long) workflow1Nodes.size()).isEqualTo(2);
    }

    @Test
    void props_are_persisted_and_reloaded() {
        var workflow = workflowRepository.saveAndFlush(
                Workflow.builder().name("Props Workflow").status(WorkflowStatus.DRAFT).build()
        );

        var props = Map.<String, Object>of("field", "amount", "operator", "gt", "value", 100);
        var saved = nodeRepository.saveAndFlush(
                Node.builder().type("condition").props(props).workflow(workflow).build()
        );

        var reloaded = nodeRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getProps().get("field")).isEqualTo("amount");
        assertThat(reloaded.getProps().get("operator")).isEqualTo("gt");
    }
}
