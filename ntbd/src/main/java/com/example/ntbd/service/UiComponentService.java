package com.example.ntbd.service;

import com.example.ntbd.Exception.PageNotFoundException;
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

import java.util.List;
import java.util.stream.Collectors;
import com.example.ntbd.domain.UiComponentProperty;

@RequiredArgsConstructor
@Service
public class UiComponentService {

    private final UiComponentRepository uiComponentRepository;
    private final PageRepository pageRepository;
    private final WorkflowRepository workflowRepository;

    @Transactional
    public UiComponentDto createComponent(NewUiComponentCommand command) {
        Page page = pageRepository.findById(new Page.PageId(command.pageId()))
                .orElseThrow(() -> new PageNotFoundException("Page not found with id: " + command.pageId()));

        Workflow workflow = null;
        if (command.workflowId() != null) {
            workflow = workflowRepository.findById(new Workflow.WorkflowId(command.workflowId()))
                    .orElseThrow(() -> new RuntimeException("Workflow not found with id: " + command.workflowId()));
        }

        UiComponent parent = null;
        if (command.parentId() != null) {
            parent = uiComponentRepository.findById(new UiComponent.UiComponentId(command.parentId()))
                    .orElseThrow(() -> new UiComponentNotFoundException("Parent UI Component not found with id: " + command.parentId()));
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
    public List<UiComponentDto> findAll() {
        return uiComponentRepository.findAll().stream()
                .map(UiComponentMapper::toDto)
                .toList();
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
                UiComponent parent = uiComponentRepository.findById(new UiComponent.UiComponentId(command.parentId()))
                        .orElseThrow(() -> new UiComponentNotFoundException("Parent UI Component not found with id: " + command.parentId()));
                component.setParent(parent);
            }
        }
        
        return UiComponentMapper.toDto(uiComponentRepository.saveAndFlush(component));
    }

    @Transactional
    public void deleteComponent(Long id) {
        if (!uiComponentRepository.existsById(new UiComponent.UiComponentId(id))) {
            throw new UiComponentNotFoundException("UI Component not found with id " + id);
        }
        uiComponentRepository.deleteById(new UiComponent.UiComponentId(id));
    }
}
