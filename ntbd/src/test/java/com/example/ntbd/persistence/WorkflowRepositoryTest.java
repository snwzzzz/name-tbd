package com.example.ntbd.persistence;

import com.example.ntbd.domain.Workflow;
import com.example.ntbd.domain.WorkflowStatus;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class WorkflowRepositoryTest {

    @Autowired
    private WorkflowRepository workflowRepository;

    @Test
    void can_save() {
        var workflow = Workflow.builder()
                .name("Customer Onboarding")
                .status(WorkflowStatus.DRAFT)
                .build();

        var saved = workflowRepository.saveAndFlush(workflow);

        assertThat(workflowRepository.findById(saved.getId())).isNotEmpty();
    }

    @Test
    void can_find_by_id() {
        var workflow = Workflow.builder()
                .name("Order Processing")
                .status(WorkflowStatus.ACTIVE)
                .build();

        var saved = workflowRepository.saveAndFlush(workflow);

        var found = workflowRepository.findById(saved.getId());
        assertThat(found).isNotEmpty();
        assertThat(found.get().getName()).isEqualTo("Order Processing");
        assertThat(found.get().getStatus()).isEqualTo(WorkflowStatus.ACTIVE);
    }
}
