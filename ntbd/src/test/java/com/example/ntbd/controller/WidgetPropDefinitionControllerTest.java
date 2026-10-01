package com.example.ntbd.controller;

import com.example.ntbd.dto.WidgetPropDefinitionDto;
import com.example.ntbd.service.WidgetPropDefinitionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WidgetPropDefinitionControllerTest {

    @Mock
    private WidgetPropDefinitionService service;

    @InjectMocks
    private WidgetPropDefinitionController controller;

    private final WidgetPropDefinitionDto label =
            new WidgetPropDefinitionDto(1L, "button", "label", "string", "Click", "Label", null, List.of());

    @Test
    void getAllDefinitions() {
        when(service.getAllDefinitions()).thenReturn(Map.of("button", List.of(label)));

        var response = controller.getAllDefinitions();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(label), response.getBody().get("button"));
    }

    @Test
    void getDefinitionsByType() {
        when(service.getDefinitionsByType("button")).thenReturn(List.of(label));

        var response = controller.getDefinitionsByType("button");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(label), response.getBody());
    }
}
