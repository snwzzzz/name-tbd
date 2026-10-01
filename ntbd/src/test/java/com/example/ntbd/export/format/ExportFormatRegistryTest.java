package com.example.ntbd.export.format;

import com.example.ntbd.export.definition.AppDefinition;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExportFormatRegistryTest {

    private static ExportFormat format(String id) {
        return new ExportFormat() {
            @Override
            public String id() {
                return id;
            }

            @Override
            public ExportedFile export(AppDefinition definition) {
                return null;
            }
        };
    }

    @Test
    void findsFormatsByTheirId() {
        ExportFormat html = format("html");
        ExportFormatRegistry registry = new ExportFormatRegistry(List.of(format("zip"), html));

        assertSame(html, registry.get("html"));
        assertEquals(List.of("html", "zip"), registry.ids());
    }

    @Test
    void rejectsUnknownFormatsAsBadRequests() {
        ExportFormatRegistry registry = new ExportFormatRegistry(List.of(format("html")));

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> registry.get("pdf"));
        assertTrue(e.getMessage().contains("available: html"));
    }

    @Test
    void refusesTwoFormatsWithOneId() {
        assertThrows(IllegalStateException.class, () -> new ExportFormatRegistry(List.of(format("html"), format("html"))));
    }
}
