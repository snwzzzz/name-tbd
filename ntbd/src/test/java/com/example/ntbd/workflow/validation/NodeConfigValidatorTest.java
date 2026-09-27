package com.example.ntbd.workflow.validation;

import com.example.ntbd.domain.Node;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class NodeConfigValidatorTest {

    @Autowired
    private NodeConfigValidator validator;

    @Test
    void validates_valid_condition_config() {
        var node = Node.builder()
                .type("CONDITION")
                .props(Map.of("field", "status", "operator", "eq", "value", "active"))
                .build();

        assertThatCode(() -> validator.validate(node))
                .doesNotThrowAnyException();
    }

    @Test
    void throws_on_invalid_condition_config() {
        var node = Node.builder()
                .type("CONDITION")
                .props(Map.of("field", "status")) // missing operator and value
                .build();

        assertThatThrownBy(() -> validator.validate(node))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("operator")
                .hasMessageContaining("value");
    }

    @Test
    void validates_valid_webhook_config() {
        var node = Node.builder()
                .type("WEBHOOK")
                .props(Map.of("url", "http://example.com"))
                .build();

        assertThatCode(() -> validator.validate(node))
                .doesNotThrowAnyException();
    }

    @Test
    void validates_valid_email_config() {
        var node = Node.builder()
                .type("EMAIL")
                .props(Map.of("to", "user@example.com", "subject", "Hello"))
                .build();

        assertThatCode(() -> validator.validate(node))
                .doesNotThrowAnyException();
    }

    @Test
    void throws_on_invalid_email_config() {
        var node = Node.builder()
                .type("EMAIL")
                .props(Map.of("to", "user@example.com")) // missing subject
                .build();

        assertThatThrownBy(() -> validator.validate(node))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("subject");
    }
}
