package com.example.ntbd.workflow.handlers;

import com.example.ntbd.domain.Node;
import com.example.ntbd.workflow.ExecutionResult;
import com.example.ntbd.workflow.FlowContext;
import com.example.ntbd.workflow.NodeHandler;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class ConditionHandler implements NodeHandler {

    @Override
    public String nodeType() {
        return "CONDITION";
    }

    @Override
    public ExecutionResult handle(Node node, FlowContext context) {
        Map<String, Object> props = node.getProps();
        if (props == null) {
            return ExecutionResult.failure("Missing properties for CONDITION node");
        }

        String field = (String) props.get("field");
        String operator = (String) props.get("operator");
        Object expectedValue = props.get("value");

        if (field == null || operator == null) {
            return ExecutionResult.failure("Missing field or operator in CONDITION node");
        }

        Object actualValue = context.get(field);

        boolean result = evaluateCondition(actualValue, operator, expectedValue);

        return result ? ExecutionResult.success("output_true", null) 
                      : ExecutionResult.success("output_false", null);
    }

    private boolean evaluateCondition(Object actual, String operator, Object expected) {
        if (actual == null && expected == null) return "eq".equals(operator);
        if (actual == null || expected == null) return "neq".equals(operator);

        switch (operator) {
            case "eq":
                return actual.toString().equals(expected.toString());
            case "neq":
                return !actual.toString().equals(expected.toString());
            case "gt":
                if (actual instanceof Number && expected instanceof Number) {
                    return ((Number) actual).doubleValue() > ((Number) expected).doubleValue();
                }
                return false;
            case "lt":
                if (actual instanceof Number && expected instanceof Number) {
                    return ((Number) actual).doubleValue() < ((Number) expected).doubleValue();
                }
                return false;
            default:
                return false;
        }
    }
}
