package com.example.ntbd.controller;

import com.example.ntbd.domain.WidgetPropDefinition;
import com.example.ntbd.persistence.WidgetPropDefinitionRepository;
import com.example.ntbd.service.WidgetPropDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping(value = "/api/widget-props", produces = "application/json")
@RequiredArgsConstructor
public class WidgetPropDefinitionController {

    private final WidgetPropDefinitionService service;

    @GetMapping
    public ResponseEntity<Map<String, List<WidgetPropDefinition>>> getAllDefinitions() {
        return ResponseEntity.ok(service.getAllDefinitions());
    }

    @GetMapping("/{type}")
    public ResponseEntity<List<WidgetPropDefinition>> getDefinitionsByType(@PathVariable String type) {
        return ResponseEntity.ok(service.getDefinitionsByType(type));
    }
}
