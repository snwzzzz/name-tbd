package com.example.ntbd.controller;

import com.example.ntbd.domain.WidgetPropDefinition;
import com.example.ntbd.persistence.WidgetPropDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/widget-props")
@RequiredArgsConstructor
public class WidgetPropDefinitionController {

    private final WidgetPropDefinitionRepository repository;

    @GetMapping
    public ResponseEntity<Map<String, List<WidgetPropDefinition>>> getAllDefinitions() {
        List<WidgetPropDefinition> allProps = repository.findAll();
        
        // Group properties by widget type so the frontend can easily consume them
        Map<String, List<WidgetPropDefinition>> groupedProps = allProps.stream()
                .collect(Collectors.groupingBy(WidgetPropDefinition::getWidgetType));
                
        return ResponseEntity.ok(groupedProps);
    }
}
