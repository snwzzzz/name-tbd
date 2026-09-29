package com.example.ntbd.controller;

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
}
