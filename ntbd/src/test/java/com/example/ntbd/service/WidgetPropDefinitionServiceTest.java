package com.example.ntbd.service;

import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.dto.WidgetPropDefinitionDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WidgetPropDefinitionServiceTest {

    private final WidgetPropDefinitionService service = new WidgetPropDefinitionService(new WidgetCatalog());

    @Test
    void definitionsOfATypeComeFromTheCatalog() {
        List<WidgetPropDefinitionDto> defs = service.getDefinitionsByType("button");

        assertThat(defs).extracting(WidgetPropDefinitionDto::propKey).containsExactly("label", "formAction", "variant", "color", "textSize");
        assertThat(defs.get(0).label()).isEqualTo("Label");
        assertThat(defs.get(0).defaultValue()).isEqualTo("Click Me");
        assertThat(defs).allMatch(d -> d.widgetType().equals("button"));
    }

    @Test
    void allTypesWithoutPositionAndSize() {
        Map<String, List<WidgetPropDefinitionDto>> all = service.getAllDefinitions();

        assertThat(all.keySet()).contains("button", "table").doesNotContain("global");
        assertThat(all.values()).flatMap(defs -> defs).extracting(WidgetPropDefinitionDto::propKey)
                .doesNotContain("x", "y", "w", "h");
        assertThat(service.getDefinitionsByType("unknown")).isEmpty();
    }
}
