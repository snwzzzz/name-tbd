package com.example.ntbd.workflow.handlers;

import com.example.ntbd.domain.Node;
import com.example.ntbd.workflow.ExecutionResult;
import com.example.ntbd.workflow.FlowContext;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class EmailHandlerTest {

    private final EmailHandler handler = new EmailHandler();

    @Test
    void returns_success_with_output_data_when_props_valid() {
        var node = Node.builder()
                .props(Map.of("to", "user@example.com", "subject", "Hello", "body", "World"))
                .build();
        var context = new FlowContext(Map.of());

        ExecutionResult result = handler.handle(node, context);

        assertThat(result.success()).isTrue();
        assertThat(result.outputPort()).isEqualTo("output_success");
        assertThat(result.outputData()).containsEntry("to", "user@example.com");
        assertThat(result.outputData()).containsEntry("sent", true);
    }

    @Test
    void returns_failure_when_to_is_missing() {
        var node = Node.builder()
                .props(Map.of("subject", "Hello"))
                .build();
        ExecutionResult result = handler.handle(node, new FlowContext(Map.of()));

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).contains("to");
    }

    @Test
    void returns_failure_when_subject_is_missing() {
        var node = Node.builder()
                .props(Map.of("to", "user@example.com"))
                .build();
        ExecutionResult result = handler.handle(node, new FlowContext(Map.of()));

        assertThat(result.success()).isFalse();
        assertThat(result.errorMessage()).contains("subject");
    }

    @Test
    void returns_failure_when_props_are_null() {
        var node = Node.builder().props(null).build();
        ExecutionResult result = handler.handle(node, new FlowContext(Map.of()));

        assertThat(result.success()).isFalse();
    }

    @Test
    void node_type_is_email() {
        assertThat(handler.nodeType()).isEqualTo("EMAIL");
    }
}
