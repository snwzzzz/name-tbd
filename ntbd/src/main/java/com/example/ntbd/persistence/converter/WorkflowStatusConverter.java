package com.example.ntbd.persistence.converter;

import com.example.ntbd.domain.WorkflowStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class WorkflowStatusConverter implements AttributeConverter<WorkflowStatus, String> {

    @Override
    public String convertToDatabaseColumn(WorkflowStatus attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public WorkflowStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : WorkflowStatus.valueOf(dbData);
    }
}
