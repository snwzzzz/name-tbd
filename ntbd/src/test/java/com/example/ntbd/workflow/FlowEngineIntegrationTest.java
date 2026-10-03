package com.example.ntbd.workflow;

import com.example.ntbd.domain.*;
import com.example.ntbd.persistence.ApplicationRepository;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.EdgeRepository;
import com.example.ntbd.persistence.NodeRepository;
import com.example.ntbd.persistence.UserRepository;
import com.example.ntbd.persistence.WorkflowRepository;
import com.example.ntbd.persistence.WorkspaceRepository;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class FlowEngineIntegrationTest {

    @Autowired
    private FlowEngine flowEngine;

    @Autowired
    private WorkflowRepository workflowRepository;

    @Autowired
    private NodeRepository nodeRepository;

    @Autowired
    private EdgeRepository edgeRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void can_execute_full_workflow_in_db() {
        var user = User.builder().username(new Username("flowtest")).email(new Email("flow@example.com")).firstName("Test").lastName("Test").build();
        userRepository.save(user);

        var app = Application.builder().workspace(workspaceRepository.save(Workspace.builder().name("Workspace").build())).title("App").description("Desc").build();
        applicationRepository.save(app);

        var branch = Branch.builder().name("main").description("main branch").createdBy(user).application(app).build();
        branchRepository.save(branch);

        var workflow = Workflow.builder().name("Test Flow").status(WorkflowStatus.ACTIVE).branch(branch).build();
        workflowRepository.save(workflow);

        var conditionNode = Node.builder().workflow(workflow).type("CONDITION")
                .props(Map.of("field", "status", "operator", "eq", "value", "active"))
                .build();
        nodeRepository.save(conditionNode);

        var webhookNode = Node.builder().workflow(workflow).type("WEBHOOK")
                .props(Map.of("url", "http://example.com"))
                .build();
        nodeRepository.save(webhookNode);

        var edge = Edge.builder().sourceNode(conditionNode).sourcePort("output_true").targetNode(webhookNode).build();
        edgeRepository.save(edge);

        // Execute workflow with condition met
        flowEngine.executeWorkflow(workflow.getId().id(), Map.of("status", "active"));

        var updatedWorkflow = workflowRepository.findById(workflow.getId()).orElseThrow();
        assertThat(updatedWorkflow.getStatus()).isEqualTo(WorkflowStatus.COMPLETED);
    }
}
