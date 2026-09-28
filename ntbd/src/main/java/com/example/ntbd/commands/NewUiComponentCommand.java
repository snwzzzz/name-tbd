package com.example.ntbd.commands;

import java.util.Map;

public record NewUiComponentCommand(
        Long pageId,
        String type,
        Map<String, Object> props,
        Long workflowId,
        Long parentId
) {
}
