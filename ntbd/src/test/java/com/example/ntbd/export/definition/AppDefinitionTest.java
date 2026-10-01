package com.example.ntbd.export.definition;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AppDefinitionTest {

    @Test
    void writesItsSectionsAsTopLevelFields() {
        AppDefinition definition = new AppDefinition(new AppDefinition.App(3L, "Shop"));
        definition.put("pages", List.of());
        definition.put("homePageId", null);

        assertEquals("{\"version\":1,\"app\":{\"id\":3,\"name\":\"Shop\"},\"pages\":[],\"homePageId\":null}",
                JsonMapper.builder().build().writeValueAsString(definition));
    }

    @Test
    void takesEachSectionOnce() {
        AppDefinition definition = new AppDefinition(new AppDefinition.App(3L, "Shop"));
        definition.put("pages", List.of());

        assertThrows(IllegalStateException.class, () -> definition.put("pages", List.of()));
        assertThrows(IllegalStateException.class, () -> definition.put("version", 2));
    }
}
