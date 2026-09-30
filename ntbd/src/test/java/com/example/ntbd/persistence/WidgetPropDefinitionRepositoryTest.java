package com.example.ntbd.persistence;

import com.example.ntbd.domain.WidgetPropDefinition;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import static org.assertj.core.api.Assertions.assertThat;

/** Checks the prop definitions the migrations seed. */
@DataJpaTest
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
public class WidgetPropDefinitionRepositoryTest {

    @Autowired
    private WidgetPropDefinitionRepository repository;

    @Test
    void the_table_widget_has_labeled_and_grouped_props() {
        var defs = repository.findByWidgetType("table");

        assertThat(defs).extracting(WidgetPropDefinition::getPropKey)
                .containsExactlyInAnyOrder("dataSourceId", "columns", "title", "maxRows", "showHeader", "striped");
        assertThat(defs).filteredOn(d -> d.getPropKey().equals("dataSourceId")).singleElement()
                .satisfies(d -> {
                    assertThat(d.getPropType()).isEqualTo("dataSource");
                    assertThat(d.getLabel()).isEqualTo("Data source");
                    assertThat(d.getGroup()).isEqualTo("Data");
                });
    }

    @Test
    void existing_props_got_labels() {
        // Only the migrated rows: on embedded databases data.sql inserts unlabeled copies as well
        assertThat(repository.findByWidgetType("button")).extracting(WidgetPropDefinition::getLabel)
                .contains("Label", "Color");
    }
}
