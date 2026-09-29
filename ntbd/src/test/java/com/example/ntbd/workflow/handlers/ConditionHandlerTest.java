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
class ConditionHandlerTest {

    private final ConditionHandler handler = new ConditionHandler();

    @Test
    void returns_true_when_condition_met() {
        var node = Node.builder()
                .props(Map.of("field", "status", "operator", "eq", "value", "active"))
                .build();
        var context = new FlowContext(Map.of("status", "active"));

        ExecutionResult result = handler.handle(node, context);

        assertThat(result.success()).isTrue();
        assertThat(result.outputPort()).isEqualTo("output_true");
    }

    @Test
    void returns_false_when_condition_not_met() {
        var node = Node.builder()
                .props(Map.of("field", "status", "operator", "eq", "value", "active"))
                .build();
        var context = new FlowContext(Map.of("status", "inactive"));

        ExecutionResult result = handler.handle(node, context);

        assertThat(result.success()).isTrue();
        assertThat(result.outputPort()).isEqualTo("output_false");
    }

    @Test
    void returns_failure_when_missing_props() {
        var node = Node.builder().props(null).build();
        ExecutionResult result = handler.handle(node, new FlowContext(Map.of()));

        assertThat(result.success()).isFalse();
        assertThat(result.outputPort()).isNull();
    }
}
