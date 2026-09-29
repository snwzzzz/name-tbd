package com.example.ntbd.mapper;

import com.example.ntbd.domain.UiComponent;
import com.example.ntbd.dto.UiComponentDto;

public class UiComponentMapper {

    public static UiComponentDto toDto(UiComponent component) {
        if (component == null) return null;

        return new UiComponentDto(
                component.getId() != null ? component.getId().id() : null,
                component.getPage() != null && component.getPage().getId() != null ? component.getPage().getId().id() : null,
                component.getType(),
                component.getProps(),
                component.getWorkflow() != null && component.getWorkflow().getId() != null ? component.getWorkflow().getId().id() : null,
                component.getParent() != null && component.getParent().getId() != null ? component.getParent().getId().id() : null,
                component.getX(),
                component.getY(),
                component.getW(),
                component.getH()
        );
    }
}
