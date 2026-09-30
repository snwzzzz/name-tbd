package com.example.ntbd.export.renderers;

import com.example.ntbd.Exception.DataSourceNotFoundException;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.service.DataSourceService;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class TableRendererTest {

    @Mock
    private DataSourceService dataSourceService;

    @InjectMocks
    private TableRenderer renderer;

    private static final DataSourceDto PEOPLE = new DataSourceDto(5L, "People", "csv", 1L,
            List.of("name", "age", "city"),
            List.of(List.of("Alice", "30", "Bern"), List.of("<Bob>", "25", "Basel"), List.of("Carol", "41", "Chur")));

    @Test
    void renders_the_chosen_columns_in_their_order_and_limits_the_rows() {
        when(dataSourceService.findById(5L)).thenReturn(PEOPLE);

        String html = renderer.render("7", Map.of(
                "title", "Team", "dataSourceId", "5", "columns", "[\"city\",\"name\"]", "maxRows", "2", "striped", "true"));

        assertThat(html).contains("data-component-id=\"7\"", "<div class=\"widget-table-title\">Team</div>",
                "<table class=\"striped\">", "<th>city</th><th>name</th>", "<td>Bern</td><td>Alice</td>",
                "&lt;Bob&gt;", "+ 1 more rows");
        assertThat(html).doesNotContain("<th>age</th>", "Carol");
    }

    @Test
    void shows_all_columns_when_none_are_chosen_and_can_hide_the_header() {
        when(dataSourceService.findById(5L)).thenReturn(PEOPLE);

        String html = renderer.render("7", Map.of("dataSourceId", "5", "columns", "[]", "showHeader", "false"));

        assertThat(html).doesNotContain("<thead>", "more rows");
        assertThat(html).contains("<td>Alice</td><td>30</td><td>Bern</td>");
    }

    @Test
    void explains_a_missing_or_unknown_data_source() {
        when(dataSourceService.findById(9L)).thenThrow(new DataSourceNotFoundException(9L));

        assertThat(renderer.render("7", Map.of())).contains("No data source selected");
        assertThat(renderer.render("7", Map.of("dataSourceId", "9"))).contains("Data source not found");
    }

    @Test
    void ignores_chosen_columns_that_are_unknown_or_malformed() {
        assertThat(TableRenderer.visibleColumns(List.of("a", "b"), List.of("x", "b"))).containsExactly(1);
        assertThat(TableRenderer.visibleColumns(List.of("a", "b"), List.of("x"))).containsExactly(0, 1);
        assertThat(TableRenderer.parseColumns("not json")).isEmpty();
        assertThat(TableRenderer.parseColumns("{\"a\":1}")).isEmpty();
    }
}
