package com.example.ntbd.workflow.validation;

import com.example.ntbd.domain.Node;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class NodeConfigValidator {

    private final Validator validator;
    private final Map<String, Class<?>> configTypeRegistry = Map.of(
            "CONDITION", ConditionConfig.class,
            "WEBHOOK", WebhookConfig.class,
            "EMAIL", EmailConfig.class
    );

    public void validate(Node node) {
        Class<?> configType = configTypeRegistry.get(node.getType());
        if (configType == null) {
            return; // No specific validation for this type
        }

        Object configInstance = mapPropsToConfig(node.getProps(), configType);
        Set<ConstraintViolation<Object>> violations = validator.validate(configInstance);

        if (!violations.isEmpty()) {
            String errors = violations.stream()
                    .map(v -> v.getPropertyPath() + " " + v.getMessage())
                    .collect(Collectors.joining(", "));
            throw new IllegalArgumentException("Invalid node configuration for type " + node.getType() + ": " + errors);
        }
    }

    private Object mapPropsToConfig(Map<String, Object> props, Class<?> configType) {
        // Simplified mapping using Jackson via our existing converter approach
        tools.jackson.databind.ObjectMapper mapper = new tools.jackson.databind.ObjectMapper();
        return mapper.convertValue(props, configType);
    }
}
