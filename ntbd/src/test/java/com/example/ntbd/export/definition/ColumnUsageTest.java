package com.example.ntbd.export.definition;

import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.content.BranchContent;
import com.example.ntbd.content.BranchContent.*;
import com.example.ntbd.domain.WorkflowStatus;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class ColumnUsageTest {

    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final WidgetCatalog CATALOG = new WidgetCatalog();

    private static final DataSourceContent PEOPLE = new DataSourceContent(1L, "people", "csv",
            List.of("name", "email", "salary", "First name"), List.of());
    private static final DataSourceContent ORDERS = new DataSourceContent(2L, "orders", "csv",
            List.of("id", "customer", "amount", "notes"), List.of());

    private static Map<Long, ColumnUsage.Used> usage(List<WidgetContent> widgets, List<NodeContent> nodes) {
        BranchContent content = new BranchContent(
                List.of(new PageContent(10L, "Home", "/", false, widgets)),
                List.of(new WorkflowContent(20L, "flow", WorkflowStatus.DRAFT, 10L, nodes, List.of())),
                List.of(PEOPLE, ORDERS));
        return ColumnUsage.of(content, CATALOG, JSON);
    }

    private static WidgetContent widget(long id, String type, Map<String, String> props) {
        return new WidgetContent(id, null, null, type, 0.0, 0.0, 1.0, 1.0, props);
    }

    private static NodeContent action(long id, Map<String, Object> props) {
        return new NodeContent(id, "Action", 0.0, 0.0, props);
    }

    @Test
    void only_the_columns_widgets_show_are_used() {
        var used = usage(List.of(
                widget(1, "table", Map.of("name", "people1", "dataSourceId", "1", "columns", "[\"name\",\"email\"]")),
                widget(2, "chart", Map.of("dataSourceId", "2", "labelColumn", "customer", "valueColumn", "amount"))), List.of());

        assertThat(used.get(1L).columns()).containsExactlyInAnyOrder("name", "email");
        assertThat(used.get(1L).all()).isFalse();
        assertThat(used.get(2L).columns()).containsExactlyInAnyOrder("customer", "amount");
    }

    @Test
    void a_table_without_a_column_list_shows_all() {
        var used = usage(List.of(widget(1, "table", Map.of("dataSourceId", "1", "columns", "[]"))), List.of());
        assertThat(used.get(1L).all()).isTrue();
        assertThat(used.get(1L).allBecause()).contains("table");
        assertThat(used.get(2L).columns()).isEmpty();
    }

    @Test
    void columns_named_in_expressions_are_used_by_field_or_by_quoted_name() {
        var used = usage(List.of(
                widget(1, "label", Map.of("text", "Hello {{ people1.selectedRow.email }} and {{ people1.selectedRow[\"First name\"] }}")),
                widget(2, "table", Map.of("name", "people1", "dataSourceId", "1", "columns", "[\"name\"]"))), List.of());

        assertThat(used.get(1L).columns()).containsExactlyInAnyOrder("name", "email", "First name");
        assertThat(used.get(1L).all()).isFalse();
    }

    @Test
    void whole_rows_or_lists_keep_every_column() {
        var used = usage(List.of(
                widget(1, "table", Map.of("name", "people1", "dataSourceId", "1", "columns", "[\"name\"]")),
                widget(2, "label", Map.of("text", "{{ data.orders.size() }}"))),
                List.of(action(5, Map.of("actionType", "http_request", "config", Map.of("body", "{{ people1.selectedRow }}")))));

        assertThat(used.get(1L).allBecause()).contains("people1.selectedRow");
        assertThat(used.get(2L).allBecause()).contains("data.orders");
    }

    @Test
    void row_actions_use_the_columns_they_write_and_the_add_row_form_shows_all() {
        var written = usage(List.of(), List.of(action(5, Map.of("actionType", "create_row", "config",
                Map.of("dataSourceId", "2", "values", List.of(Map.of("column", "notes", "value", "x")))))));
        assertThat(written.get(2L).columns()).containsExactly("notes");

        var form = usage(List.of(widget(1, "table", Map.of("dataSourceId", "2", "columns", "[\"customer\"]"))),
                List.of(action(5, Map.of("actionType", "table_action", "config", Map.of("tableId", "1", "operation", "add_row")))));
        assertThat(form.get(2L).all()).isTrue();
    }

    @Test
    void plain_texts_that_mention_rows_do_not_keep_everything() {
        var used = usage(List.of(widget(1, "table", Map.of("name", "t", "dataSourceId", "1", "columns", "[\"name\"]"))),
                List.of(action(5, Map.of("actionType", "show_message", "config", Map.of("message", "Deleted the row")))));
        assertThat(used.get(1L).all()).isFalse();
    }
}
