package com.example.ntbd.datasource.parsers;

import com.example.ntbd.datasource.ParsedTable;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class CsvParserTest {

    private final CsvParser parser = new CsvParser();

    @Test
    void reads_header_and_rows() {
        ParsedTable table = parser.parse("name,age\nAlice,30\nBob,25\n");

        assertThat(table.columns()).containsExactly("name", "age");
        assertThat(table.rows()).containsExactly(List.of("Alice", "30"), List.of("Bob", "25"));
    }

    @Test
    void handles_quotes_escaped_quotes_and_line_breaks_in_values() {
        ParsedTable table = parser.parse("name,note\r\n\"Doe, Jane\",\"said \"\"hi\"\"\nthen left\"\r\n");

        assertThat(table.rows()).containsExactly(List.of("Doe, Jane", "said \"hi\"\nthen left"));
    }

    @Test
    void pads_short_rows_and_skips_blank_lines() {
        ParsedTable table = parser.parse("a,b,c\n1\n\n2,3,\n");

        assertThat(table.rows()).containsExactly(List.of("1", "", ""), List.of("2", "3", ""));
    }

    @Test
    void strips_bom_and_names_blank_headers() {
        ParsedTable table = parser.parse("﻿ id , \nx,y");

        assertThat(table.columns()).containsExactly("id", "Column 2");
    }

    @Test
    void header_only_gives_no_rows() {
        assertThat(parser.parse("a,b").rows()).isEmpty();
    }

    @Test
    void rejects_empty_content() {
        assertThatThrownBy(() -> parser.parse("  \n")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejects_rows_with_more_values_than_columns() {
        assertThatThrownBy(() -> parser.parse("a\n1,2"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("row 2");
    }

    @Test
    void rejects_unterminated_quotes() {
        assertThatThrownBy(() -> parser.parse("a\n\"open"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unterminated");
    }
}
