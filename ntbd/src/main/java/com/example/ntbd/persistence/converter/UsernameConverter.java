package com.example.ntbd.persistence.converter;

import com.example.ntbd.domain.domain.User;
import com.example.ntbd.domain.domain.Username;
import jakarta.persistence.AttributeConverter;

public class UsernameConverter implements AttributeConverter<Username, String> {

    @Override
    public String convertToDatabaseColumn(Username attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public Username convertToEntityAttribute(String dbData) {
        return dbData == null ? null : new Username(dbData);
    }
}
