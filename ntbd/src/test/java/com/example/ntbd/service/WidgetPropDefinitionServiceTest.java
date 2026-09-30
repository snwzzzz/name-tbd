package com.example.ntbd.service;

import com.example.ntbd.domain.WidgetPropDefinition;
import com.example.ntbd.persistence.WidgetPropDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WidgetPropDefinitionServiceTest {

    @Mock
    private WidgetPropDefinitionRepository repository;

    @InjectMocks
    private WidgetPropDefinitionService service;

    @Test
    void getAllDefinitions_groupsByWidgetType() {
        WidgetPropDefinition btnDef = new WidgetPropDefinition(1L, "button", "label", "string", "Click");
        WidgetPropDefinition lblDef = new WidgetPropDefinition(2L, "label", "text", "string", "Label");

        when(repository.findAll()).thenReturn(List.of(btnDef, lblDef));

        Map<String, List<WidgetPropDefinition>> result = service.getAllDefinitions();

        assertEquals(List.of(btnDef), result.get("button"));
        assertEquals(List.of(lblDef), result.get("label"));
    }

    @Test
    void getDefinitionsByType() {
        WidgetPropDefinition btnDef = new WidgetPropDefinition(1L, "button", "label", "string", "Click");

        when(repository.findByWidgetType("button")).thenReturn(List.of(btnDef));

        assertEquals(List.of(btnDef), service.getDefinitionsByType("button"));
    }
}
