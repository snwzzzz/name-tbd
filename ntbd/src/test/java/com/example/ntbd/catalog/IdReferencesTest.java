package com.example.ntbd.catalog;

import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class IdReferencesTest {

    /** Catalog prop types whose values are never ids (text, numbers, choices, column names). */
    private static final Set<String> PLAIN_PROP_TYPES = Set.of("string", "number", "boolean", "color", "select", "columns");

    private final IdReferences references = new IdReferences();

    @Test
    void reads_what_the_shared_file_says() {
        assertThat(references.ofPropType("page")).contains(IdReferences.Kind.PAGE);
        assertThat(references.ofPropType("pages")).contains(IdReferences.Kind.PAGE_LIST);
        assertThat(references.ofPropType("dataSource")).contains(IdReferences.Kind.DATA_SOURCE);
        assertThat(references.ofPropType("string")).isEmpty();
        assertThat(references.ofNodeKey("elementId")).contains(IdReferences.Kind.WIDGET);
        assertThat(references.ofNodeKey("detailPageId")).contains(IdReferences.Kind.PAGE);
        assertThat(references.ofNodeKey("text")).isEmpty();
    }

    @Test
    void every_catalog_prop_type_is_known_to_hold_an_id_or_not() {
        Set<String> unknown = new TreeSet<>();
        for (WidgetCatalogDocument.Widget widget : new WidgetCatalog().widgets()) {
            for (WidgetCatalogDocument.Prop prop : widget.props()) {
                if (!PLAIN_PROP_TYPES.contains(prop.type()) && references.ofPropType(prop.type()).isEmpty()) {
                    unknown.add(prop.type());
                }
            }
        }
        // A new prop type: list it in shared/id-references.json if it holds an id, else in PLAIN_PROP_TYPES
        assertThat(unknown).isEmpty();
    }
}
