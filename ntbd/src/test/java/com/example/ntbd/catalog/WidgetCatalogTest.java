package com.example.ntbd.catalog;

import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class WidgetCatalogTest {

    @Test
    void loads_the_shared_catalog() {
        var catalog = new WidgetCatalog();

        assertThat(catalog.widgets()).extracting(WidgetCatalogDocument.Widget::type)
                .contains("button", "label", "table", "detail", "link", "nav", "container");
        assertThat(catalog.globalProps()).extracting(WidgetCatalogDocument.Prop::key).containsExactly("x", "y", "w", "h");
        assertThat(catalog.defaultsOf("table")).containsEntry("maxRows", "10").containsEntry("columns", "[]");
        assertThat(catalog.defaultsOf("unknown")).isEmpty();
    }

    @Test
    void rejects_duplicate_widget_types() {
        var widget = new WidgetCatalogDocument.Widget("button", "Button", null, null, null, null, null, null, null, List.of());
        var document = new WidgetCatalogDocument(1, List.of(), List.of(), List.of(widget, widget));

        assertThatThrownBy(() -> new WidgetCatalog(document))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("twice");
    }

    @Test
    void rejects_props_without_a_type() {
        var prop = new WidgetCatalogDocument.Prop("label", null, null, null, null, null);
        var widget = new WidgetCatalogDocument.Widget("button", "Button", null, null, null, null, null, null, null, List.of(prop));

        assertThatThrownBy(() -> new WidgetCatalog(new WidgetCatalogDocument(1, List.of(), List.of(), List.of(widget))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no key or type");
    }
}
