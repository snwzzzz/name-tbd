package com.example.ntbd.dto;

import java.util.Map;

public record UiComponentDto(
        Long id,
        Long pageId,
        String type,
        Map<String, Object> props,
        Long workflowId,
        Long parentId
) {
}
