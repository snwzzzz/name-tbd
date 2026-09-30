package com.example.ntbd.mapper;

import com.example.ntbd.domain.UiComponent;
import com.example.ntbd.dto.UiComponentDto;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.HashMap;

public class UiComponentMapper {

    public static UiComponentDto toDto(UiComponent component) {
        if (component == null) return null;

        Map<String, Object> props = new HashMap<>();
        if (component.getProperties() != null) {
            props = component.getProperties().stream()
                .collect(Collectors.toMap(
                    com.example.ntbd.domain.UiComponentProperty::getPropKey,
                    com.example.ntbd.domain.UiComponentProperty::getPropValue,
                    (existing, replacement) -> existing
                ));
        }

        return new UiComponentDto(
                component.getId() != null ? component.getId().id() : null,
                component.getPage() != null && component.getPage().getId() != null ? component.getPage().getId().id() : null,
                component.getType(),
                props,
                component.getWorkflow() != null && component.getWorkflow().getId() != null ? component.getWorkflow().getId().id() : null,
                component.getParent() != null && component.getParent().getId() != null ? component.getParent().getId().id() : null,
                component.getX(),
                component.getY(),
                component.getW(),
                component.getH()
        );
    }
}
