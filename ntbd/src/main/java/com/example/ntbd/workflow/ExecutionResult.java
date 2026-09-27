package com.example.ntbd.workflow;

import java.util.Map;

public record ExecutionResult(
        String outputPort,
        Map<String, Object> outputData,
        boolean success,
        String errorMessage
) {

    public static ExecutionResult success(String outputPort, Map<String, Object> outputData) {
        return new ExecutionResult(outputPort, outputData, true, null);
    }

    public static ExecutionResult failure(String errorMessage) {
        return new ExecutionResult(null, Map.of(), false, errorMessage);
    }
}
