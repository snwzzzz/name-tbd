package com.example.ntbd.service;

import com.example.ntbd.Exception.WorkflowNotFoundException;
import com.example.ntbd.Exception.PageNotFoundException;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.Exception.UiComponentNotFoundException;
import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.domain.Page;
import com.example.ntbd.domain.UiComponent;
import com.example.ntbd.domain.Workflow;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.mapper.UiComponentMapper;
import com.example.ntbd.persistence.PageRepository;
import com.example.ntbd.persistence.UiComponentRepository;
import com.example.ntbd.persistence.WorkflowRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.example.ntbd.domain.UiComponentProperty;

@RequiredArgsConstructor
@Service
public class UiComponentService {

    private final UiComponentRepository uiComponentRepository;
    private final PageRepository pageRepository;
    private final WorkflowRepository workflowRepository;
    private final WidgetCatalog widgetCatalog;

    @Transactional
    public UiComponentDto createComponent(NewUiComponentCommand command) {
        Page page = pageRepository.findById(new Page.PageId(command.pageId()))
                .orElseThrow(() -> new PageNotFoundException("Page not found with id: " + command.pageId()));

        // The workflow must be of the page's branch, the parent on the same page; others count as not found
        Workflow workflow = null;
        if (command.workflowId() != null) {
            workflow = workflowRepository.findById(new Workflow.WorkflowId(command.workflowId()))
                    .filter(w -> w.getBranch() != null && w.getBranch().getId().equals(page.getBranch().getId()))
                    .orElseThrow(() -> new WorkflowNotFoundException(command.workflowId()));
        }

        UiComponent parent = null;
        if (command.parentId() != null) {
            parent = parentOnPage(command.parentId(), page);
        }

        UiComponent component = UiComponent.builder()
                .page(page)
                .type(command.type())
                .workflow(workflow)
                .parent(parent)
                .x(command.x())
                .y(command.y())
                .w(command.w())
                .h(command.h())
                .build();

        if (command.props() != null) {
            List<UiComponentProperty> propsList = command.props().entrySet().stream().map(e -> {
                UiComponentProperty p = new UiComponentProperty();
                p.setComponent(component);
                p.setPropKey(e.getKey());
                p.setPropValue(e.getValue() != null ? e.getValue().toString() : null);
                return p;
            }).collect(Collectors.toList());
            component.setProperties(propsList);
        }

        return UiComponentMapper.toDto(uiComponentRepository.saveAndFlush(component));
    }

    @Transactional
    public List<UiComponentDto> findByPageIdWithDefaults(Long pageId) {
        return uiComponentRepository.findByPage_Id(new Page.PageId(pageId)).stream()
                .map(component -> withDefaults(UiComponentMapper.toDto(component)))
                .toList();
    }

    /** The component with its type's default props, overlaid with its own (what findPropsById gives). */
    private UiComponentDto withDefaults(UiComponentDto dto) {
        Map<String, Object> props = new LinkedHashMap<>(widgetCatalog.defaultsOf(dto.type()));
        if (dto.props() != null) props.putAll(dto.props());
        return new UiComponentDto(dto.id(), dto.pageId(), dto.type(), props, dto.workflowId(), dto.parentId(),
                dto.x(), dto.y(), dto.w(), dto.h());
    }

    @Transactional
    public UiComponentDto findById(Long id) {
        return uiComponentRepository.findById(new UiComponent.UiComponentId(id))
                .map(UiComponentMapper::toDto)
                .orElseThrow(() -> new UiComponentNotFoundException("UI Component not found with id " + id));
    }
    @Transactional
    public List<UiComponentDto> findByPageId(Long pageId) {
        return uiComponentRepository.findByPage_Id(new Page.PageId(pageId)).stream()
                .map(UiComponentMapper::toDto)
                .toList();
    }

    @Transactional
    public UiComponentDto updateComponent(Long id, com.example.ntbd.commands.UpdateUiComponentCommand command) {
        UiComponent component = uiComponentRepository.findById(new UiComponent.UiComponentId(id))
                .orElseThrow(() -> new UiComponentNotFoundException("UI Component not found with id " + id));

        if (command.props() != null) {
            component.getProperties().clear();
            List<UiComponentProperty> propsList = command.props().entrySet().stream().map(e -> {
                UiComponentProperty p = new UiComponentProperty();
                p.setComponent(component);
                p.setPropKey(e.getKey());
                p.setPropValue(e.getValue() != null ? e.getValue().toString() : null);
                return p;
            }).collect(Collectors.toList());
            component.getProperties().addAll(propsList);
        }
        if (command.x() != null) {
            component.setX(command.x());
        }
        if (command.y() != null) {
            component.setY(command.y());
        }
        if (command.w() != null) {
            component.setW(command.w());
        }
        if (command.h() != null) {
            component.setH(command.h());
        }
        
        if (command.parentId() != null) {
            if (command.parentId() == -1L) {
                component.setParent(null);
            } else {
                if (command.parentId().equals(id)) {
                    throw new IllegalArgumentException("A UI component can't be its own parent");
                }
                component.setParent(parentOnPage(command.parentId(), component.getPage()));
            }
        }
        
        return UiComponentMapper.toDto(uiComponentRepository.saveAndFlush(component));
    }

    @Transactional
    public Map<String, String> findPropsById(Long id) {
        UiComponent component = uiComponentRepository.findById(new UiComponent.UiComponentId(id))
                .orElseThrow(() -> new UiComponentNotFoundException("UI Component not found with id " + id));

        // Start from the widget type's defaults (from the widget catalog), then overlay the values stored for this component
        Map<String, String> props = new LinkedHashMap<>(widgetCatalog.defaultsOf(component.getType()));
        component.getProperties()
                .forEach(prop -> props.put(prop.getPropKey(), prop.getPropValue()));
        return props;
    }


    /** The parent for a component on {@code page}: a component on the same page (others count as not found). */
    private UiComponent parentOnPage(Long parentId, Page page) {
        return uiComponentRepository.findById(new UiComponent.UiComponentId(parentId))
                .filter(parent -> parent.getPage().getId().equals(page.getId()))
                .orElseThrow(() -> new UiComponentNotFoundException("Parent UI Component not found with id: " + parentId));
    }
}
