package com.example.ntbd.service;

import com.example.ntbd.Exception.PageNotFoundException;
import com.example.ntbd.Exception.UiComponentNotFoundException;
import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.domain.Page;
import com.example.ntbd.domain.UiComponent;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.persistence.PageRepository;
import com.example.ntbd.persistence.UiComponentRepository;
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

    @InjectMocks
    private UiComponentService uiComponentService;

    @Test
    void createComponent() {
        NewUiComponentCommand command = new NewUiComponentCommand(1L, "Button", Map.of("label", "Click"), null, null);
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
}
