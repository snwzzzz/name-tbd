package com.example.ntbd.export;

import com.example.ntbd.auth.TestSignIn;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.catalog.WidgetCatalogDocument;
import com.example.ntbd.commands.NewPageCommand;
import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.commands.UpdateApplicationCommand;
import com.example.ntbd.domain.AppTheme;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.export.definition.AppDefinitionService;
import com.example.ntbd.service.ApplicationService;
import com.example.ntbd.service.PageService;
import com.example.ntbd.service.UiComponentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Every widget type of the catalog, saved on a page and exported: each arrives in the app
 * definition with all of its catalog settings (defaults filled in), containers with what's inside
 * them. The exported app's side (each widget drawn, and checked with axe-core) is the frontend's
 * widget-catalog.export.spec.ts. Also the app's theme, which the definition carries.
 */
@SpringBootTest(properties = "ntbd.export.runtime-locations=classpath:export-runtime-test/")
@Transactional
class WidgetCatalogExportTest {

    private static final long BRANCH = -1L;
    private static final long APPLICATION = -1L;

    @Autowired private PageService pageService;
    @Autowired private UiComponentService uiComponentService;
    @Autowired private ApplicationService applicationService;
    @Autowired private AppDefinitionService definitionService;
    @Autowired private WidgetCatalog catalog;
    @Autowired private ObjectMapper objectMapper;

    private PageDto page;

    @BeforeEach
    void setUp() {
        TestSignIn.signInAs(-1L);
        page = pageService.createPage(new NewPageCommand("Catalog", "/catalog", BRANCH));
    }

    @AfterEach
    void signOut() {
        TestSignIn.signOut();
    }

    private JsonNode definition() {
        return objectMapper.readTree(objectMapper.writeValueAsString(definitionService.build(BRANCH)));
    }

    private JsonNode exportedPage() {
        return StreamSupport.stream(definition().get("pages").spliterator(), false)
                .filter(p -> p.get("name").asString().equals("Catalog"))
                .findFirst().orElseThrow();
    }

    @Test
    void exportsEveryCatalogWidgetWithAllItsSettings() {
        Map<Long, WidgetCatalogDocument.Widget> placed = new HashMap<>();
        double y = 0;
        for (WidgetCatalogDocument.Widget widget : catalog.widgets()) {
            UiComponentDto component = uiComponentService.createComponent(new NewUiComponentCommand(
                    page.id(), widget.type(), Map.of(), null, null, 0.0, y, (double) widget.size().w(), (double) widget.size().h()));
            placed.put(component.id(), widget);
            y += widget.size().h();
        }

        JsonNode components = exportedPage().get("components");
        assertEquals(catalog.widgets().size(), components.size());
        for (JsonNode component : components) {
            WidgetCatalogDocument.Widget widget = placed.get(component.get("id").asLong());
            assertNotNull(widget, "an exported widget that was placed: " + component);
            assertEquals(widget.type(), component.get("type").asString());
            for (WidgetCatalogDocument.Prop prop : widget.props()) {
                assertTrue(component.get("props").has(prop.key()), widget.type() + " exports its setting " + prop.key());
                assertEquals(prop.defaultValue(), component.get("props").get(prop.key()).asString(), widget.type() + "." + prop.key());
            }
        }
    }

    @Test
    void exportsContainersWithTheWidgetsInside() {
        for (String type : new String[] {"container", "tabs", "modal", "form"}) {
            UiComponentDto container = uiComponentService.createComponent(
                    new NewUiComponentCommand(page.id(), type, Map.of(), null, null, 0.0, 0.0, 30.0, 20.0));
            uiComponentService.createComponent(
                    new NewUiComponentCommand(page.id(), "input", Map.of("field", "name", "tab", "1"), null, container.id(), 0.0, 0.0, 10.0, 4.0));
        }

        for (JsonNode container : exportedPage().get("components")) {
            JsonNode child = container.get("children").get(0);
            assertEquals("input", child.get("type").asString());
            assertEquals("name", child.get("props").get("field").asString());
            // Which tab a widget is on travels with it
            assertEquals("1", child.get("props").get("tab").asString());
        }
    }

    @Test
    void carriesTheAppsTheme() {
        assertTrue(definition().get("theme").isNull(), "no theme: the default preset");

        applicationService.updateApplication(APPLICATION, new UpdateApplicationCommand(null, null,
                new AppTheme("Custom", "#AA3300", "Rounded", "Large", " ")));
        JsonNode theme = definition().get("theme");
        assertEquals("Custom", theme.get("preset").asString());
        assertEquals("#AA3300", theme.get("primary").asString());
        assertEquals("Rounded", theme.get("font").asString());
        assertTrue(theme.get("spacing") == null || theme.get("spacing").isNull(), "a blank value comes from the preset");

        applicationService.updateApplication(APPLICATION, new UpdateApplicationCommand(null, null, new AppTheme("Fresh", "#000000", null, null, null)));
        assertTrue(definition().get("theme").get("primary").isNull(), "a preset keeps only its name");
    }

    @Test
    void refusesThemesThatDontExist() {
        assertThrows(IllegalArgumentException.class, () -> applicationService.updateApplication(APPLICATION,
                new UpdateApplicationCommand(null, null, new AppTheme("Neon", null, null, null, null))));
        assertThrows(IllegalArgumentException.class, () -> applicationService.updateApplication(APPLICATION,
                new UpdateApplicationCommand(null, null, new AppTheme("Custom", "red", null, null, null))));
        assertThrows(IllegalArgumentException.class, () -> applicationService.updateApplication(APPLICATION,
                new UpdateApplicationCommand(null, null, new AppTheme("Custom", null, "Comic Sans", null, null))));
    }
}
