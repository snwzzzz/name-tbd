package com.example.ntbd.service;

import com.example.ntbd.Exception.PageNotFoundException;
import com.example.ntbd.Exception.UiComponentNotFoundException;
import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.domain.Page;
import com.example.ntbd.domain.UiComponent;
import com.example.ntbd.domain.UiComponentProperty;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.persistence.PageRepository;
import com.example.ntbd.persistence.UiComponentRepository;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.persistence.WorkflowRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UiComponentServiceTest {

    @Mock
    private UiComponentRepository uiComponentRepository;

    @Mock
    private PageRepository pageRepository;

    @Mock
    private WorkflowRepository workflowRepository;

    @Mock
    private WidgetCatalog widgetCatalog;

    @InjectMocks
    private UiComponentService uiComponentService;

    @Test
    void createComponent() {
        NewUiComponentCommand command = new NewUiComponentCommand(1L, "Button", Map.of("label", "Click"), null, null, 0.0, 0.0, 0.0, 0.0);
        Page page = new Page();
        page.setId(new Page.PageId(1L));

        UiComponent component = UiComponent.builder().type("Button").page(page).id(new UiComponent.UiComponentId(1L)).build();

        when(pageRepository.findById(new Page.PageId(1L))).thenReturn(Optional.of(page));
        when(uiComponentRepository.saveAndFlush(any(UiComponent.class))).thenReturn(component);

        UiComponentDto result = uiComponentService.createComponent(command);

        assertNotNull(result);
        assertEquals(1L, result.id());
        assertEquals("Button", result.type());
        verify(pageRepository, times(1)).findById(new Page.PageId(1L));
        verify(uiComponentRepository, times(1)).saveAndFlush(any(UiComponent.class));
    }

    @Test
    void findById_NotFound() {
        when(uiComponentRepository.findById(new UiComponent.UiComponentId(1L))).thenReturn(Optional.empty());
        assertThrows(UiComponentNotFoundException.class, () -> uiComponentService.findById(1L));
    }

    @Test
    void updateComponent() {
        UiComponent component = UiComponent.builder()
                .id(new UiComponent.UiComponentId(1L))
                .type("Button")
                .x(10.0).y(20.0).w(100.0).h(50.0)
                .build();
        
        when(uiComponentRepository.findById(new UiComponent.UiComponentId(1L))).thenReturn(Optional.of(component));
        when(uiComponentRepository.saveAndFlush(any(UiComponent.class))).thenReturn(component);

        var command = new com.example.ntbd.commands.UpdateUiComponentCommand(null, null, 15.0, 25.0, null, null);
        UiComponentDto result = uiComponentService.updateComponent(1L, command);

        assertNotNull(result);
        assertEquals(15.0, component.getX());
        assertEquals(25.0, component.getY());
        assertEquals(100.0, component.getW());
        verify(uiComponentRepository).saveAndFlush(component);
    }

    @Test
    void findByPageId() {
        UiComponent component = UiComponent.builder().type("Button").id(new UiComponent.UiComponentId(1L)).build();
        when(uiComponentRepository.findByPage_Id(new Page.PageId(1L))).thenReturn(java.util.List.of(component));
        
        java.util.List<UiComponentDto> results = uiComponentService.findByPageId(1L);
        assertEquals(1, results.size());
        assertEquals("Button", results.get(0).type());
    }

    @Test
    void findPropsById_overlaysStoredValuesOnDefaults() {
        UiComponent component = UiComponent.builder().type("button").id(new UiComponent.UiComponentId(1L)).build();
        component.getProperties().add(new UiComponentProperty(1L, component, "label", "Save"));

        when(uiComponentRepository.findById(new UiComponent.UiComponentId(1L))).thenReturn(Optional.of(component));
        when(widgetCatalog.defaultsOf("button")).thenReturn(Map.of("label", "Click Me", "color", "#3b82f6"));

        Map<String, String> props = uiComponentService.findPropsById(1L);

        assertEquals(Map.of("label", "Save", "color", "#3b82f6"), props);
    }

    @Test
    void findPropsById_NotFound() {
        when(uiComponentRepository.findById(new UiComponent.UiComponentId(1L))).thenReturn(Optional.empty());
        assertThrows(UiComponentNotFoundException.class, () -> uiComponentService.findPropsById(1L));
    }
}
