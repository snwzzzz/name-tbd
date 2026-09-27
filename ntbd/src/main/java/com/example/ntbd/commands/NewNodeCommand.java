package com.example.ntbd.commands;

import java.util.Map;

public record NewNodeCommand(
        Long workflowId,
        String type,
        Map<String, Object> props
) {}
