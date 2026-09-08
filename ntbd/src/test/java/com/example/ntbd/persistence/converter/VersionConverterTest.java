package com.example.ntbd.persistence.converter;

import com.example.ntbd.domain.Version;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class VersionConverterTest {

    private final VersionConverter converter = new VersionConverter();

    @Test
    public void converts_version_to_database_column() {
        var version = new Version("1.2.3");

        var result = converter.convertToDatabaseColumn(version);

        assertThat(result).isEqualTo("1.2.3");
    }

    @Test
    public void null_attribute_converts_to_null_column() {
        var result = converter.convertToDatabaseColumn(null);

        assertThat(result).isNull();
    }

    @Test
    public void converts_database_column_to_version() {
        var result = converter.convertToEntityAttribute("1.2.3");

        assertThat(result).isEqualTo(new Version("1.2.3"));
    }

    @Test
    public void null_column_converts_to_null_attribute() {
        var result = converter.convertToEntityAttribute(null);

        assertThat(result).isNull();
    }
}