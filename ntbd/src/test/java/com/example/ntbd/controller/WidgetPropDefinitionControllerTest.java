package com.example.ntbd.controller;

import com.example.ntbd.domain.WidgetPropDefinition;
import com.example.ntbd.persistence.WidgetPropDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WidgetPropDefinitionControllerTest {

    @Mock
    private WidgetPropDefinitionRepository repository;

    @InjectMocks
    private WidgetPropDefinitionController controller;

    @Test
    void shouldReturnGroupedDefinitions() {
        // Arrange
        WidgetPropDefinition btnDef = new WidgetPropDefinition(1L, "button", "label", "string", "Click");
        WidgetPropDefinition lblDef = new WidgetPropDefinition(2L, "label", "text", "string", "Label");
        
        when(repository.findAll()).thenReturn(Arrays.asList(btnDef, lblDef));

        // Act
        ResponseEntity<Map<String, List<WidgetPropDefinition>>> response = controller.getAllDefinitions();

        // Assert
        assertNotNull(response.getBody());
        assertEquals(200, response.getStatusCode().value());
        
        Map<String, List<WidgetPropDefinition>> body = response.getBody();
        assertEquals(1, body.get("button").size());
        assertEquals("label", body.get("button").get(0).getPropKey());
        
        assertEquals(1, body.get("label").size());
        assertEquals("text", body.get("label").get(0).getPropKey());
    }
}
