package com.example.ntbd.workflow;

import com.example.ntbd.workflow.handlers.ConditionHandler;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class NodeHandlerRegistryTest {

    @Test
    void can_resolve_handler() {
        var conditionHandler = new ConditionHandler();
        var registry = new NodeHandlerRegistry(List.of(conditionHandler));

        var resolved = registry.getHandler("CONDITION");
        assertThat(resolved).isSameAs(conditionHandler);
    }

    @Test
    void throws_when_handler_not_found() {
        var registry = new NodeHandlerRegistry(List.of());

        assertThatThrownBy(() -> registry.getHandler("UNKNOWN"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("UNKNOWN");
    }
}
