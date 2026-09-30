package com.example.ntbd.service;

import com.example.ntbd.domain.WidgetPropDefinition;
import com.example.ntbd.persistence.WidgetPropDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RequiredArgsConstructor

@Service
public class WidgetPropDefinitionService {

    private final WidgetPropDefinitionRepository repository;

    public Map<String, List<WidgetPropDefinition>> getAllDefinitions() {
        List<WidgetPropDefinition> allProps = repository.findAll();

        // Group properties by widget type so the frontend can easily consume them

        return allProps.stream()
                .collect(Collectors.groupingBy(WidgetPropDefinition::getWidgetType));
    }

    public List<WidgetPropDefinition> getDefinitionsByType(String widgetType) {
        return repository.findByWidgetType(widgetType);
    }

}
