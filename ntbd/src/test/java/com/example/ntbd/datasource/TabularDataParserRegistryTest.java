package com.example.ntbd.datasource;

import com.example.ntbd.datasource.parsers.CsvParser;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class TabularDataParserRegistryTest {

    @Test
    void can_resolve_parser_ignoring_case() {
        var csvParser = new CsvParser();
        var registry = new TabularDataParserRegistry(List.of(csvParser));

        assertThat(registry.getParser(" CSV ")).isSameAs(csvParser);
    }

    @Test
    void throws_when_parser_not_found() {
        var registry = new TabularDataParserRegistry(List.of());

        assertThatThrownBy(() -> registry.getParser("xlsx"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("xlsx");
    }
}
