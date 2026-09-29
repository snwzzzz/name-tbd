package com.example.ntbd.persistence.converter;

import com.example.ntbd.domain.Username;
import com.example.ntbd.domain.Version;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Convert;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class VersionConverter implements AttributeConverter<Version, String> {
    @Override
    public String convertToDatabaseColumn(Version attribute) {
        return attribute == null ? null : attribute.value();
    }

    @Override
    public Version convertToEntityAttribute(String dbData) {
        return dbData == null ? null : new Version(dbData);
    }
}
