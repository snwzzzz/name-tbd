package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.service.UiComponentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UiComponentControllerTest {

    @Mock
    private UiComponentService uiComponentService;

    @Mock
    private WorkspaceAccess access;

    @InjectMocks
    private UiComponentController uiComponentController;

    @Test
    void createComponent() {
        NewUiComponentCommand command = new NewUiComponentCommand(1L, "Button", Map.of(), null, null, 0.0, 0.0, 0.0, 0.0);
        UiComponentDto dto = new UiComponentDto(1L, 1L, "Button", Map.of(), null, null, 0.0, 0.0, 0.0, 0.0);
        
        when(uiComponentService.createComponent(command)).thenReturn(dto);

        ResponseEntity<UiComponentDto> response = uiComponentController.createComponent(command);
        
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(dto, response.getBody());
    }

    @Test
    void getComponentProps() {
        Map<String, String> props = Map.of("label", "Save", "color", "#3b82f6");

        when(uiComponentService.findPropsById(1L)).thenReturn(props);

        ResponseEntity<Map<String, String>> response = uiComponentController.getComponentProps(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(props, response.getBody());
    }
}
