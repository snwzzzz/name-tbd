package com.example.ntbd.persistence.converter;

import com.example.ntbd.domain.VariableDefinition;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

/** Variables (of a branch or a page) as JSON text; null or unreadable: none. */
@Converter
public class VariablesConverter implements AttributeConverter<List<VariableDefinition>, String> {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<List<VariableDefinition>> TYPE = new TypeReference<>() { };

    @Override
    public String convertToDatabaseColumn(List<VariableDefinition> variables) {
        return variables == null || variables.isEmpty() ? null : JSON.writeValueAsString(variables);
    }

    @Override
    public List<VariableDefinition> convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return JSON.readValue(json, TYPE);
        } catch (JacksonException e) {
            return List.of();
        }
    }
}
