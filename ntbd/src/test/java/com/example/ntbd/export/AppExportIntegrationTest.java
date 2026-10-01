package com.example.ntbd.export;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.commands.NewDataSourceCommand;
import com.example.ntbd.commands.NewEdgeCommand;
import com.example.ntbd.commands.NewNodeCommand;
import com.example.ntbd.commands.NewPageCommand;
import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.controller.ExportController;
import com.example.ntbd.dto.NodeDto;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.export.definition.AppDefinitionService;
import com.example.ntbd.service.DataSourceService;
import com.example.ntbd.service.EdgeService;
import com.example.ntbd.service.NodeService;
import com.example.ntbd.service.PageService;
import com.example.ntbd.service.UiComponentService;
import com.example.ntbd.service.WorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * A branch's app, from what the editor saved to its definition and the downloadable file. Packaged
 * with a stand-in runtime (test resources), so the test doesn't need the frontend's runtime build.
 */
@SpringBootTest(properties = "ntbd.export.runtime-locations=classpath:export-runtime-test/")
@Transactional
class AppExportIntegrationTest {

    private static final long BRANCH = -1L;

    @Autowired private PageService pageService;
    @Autowired private UiComponentService uiComponentService;
    @Autowired private WorkflowService workflowService;
    @Autowired private NodeService nodeService;
    @Autowired private EdgeService edgeService;
    @Autowired private DataSourceService dataSourceService;
    @Autowired private AppDefinitionService definitionService;
    @Autowired private ExportController exportController;
    @Autowired private ObjectMapper objectMapper;

    private PageDto about;
    private UiComponentDto button;
    private UiComponentDto label;

    @BeforeEach
    void setUp() {
        about = pageService.createPage(new NewPageCommand("About", "/about", BRANCH));
        UiComponentDto box = uiComponentService.createComponent(
                new NewUiComponentCommand(about.id(), "container", Map.of(), null, null, 0.0, 0.0, 6.0, 3.0));
        label = uiComponentService.createComponent(
                new NewUiComponentCommand(about.id(), "label", Map.of("text", "Hi"), null, box.id(), 0.0, 0.0, 2.0, 1.0));
        button = uiComponentService.createComponent(
                new NewUiComponentCommand(about.id(), "button", Map.of(), null, null, 6.0, 0.0, 2.0, 1.0));

        Long workflowId = workflowService.findOrCreateForPage(about.id()).id();
        NodeDto trigger = nodeService.createNode(new NewNodeCommand(workflowId, "Trigger",
                Map.of("triggerType", "element_click", "elementId", String.valueOf(button.id())), 0.0, 0.0));
        NodeDto action = nodeService.createNode(new NewNodeCommand(workflowId, "Action",
                Map.of("actionType", "set_text", "config", Map.of("targetId", String.valueOf(label.id()), "text", "Bye")), 300.0, 0.0));
        edgeService.createEdge(new NewEdgeCommand(trigger.id(), action.id(), "out"));

        dataSourceService.importDataSource(new NewDataSourceCommand(BRANCH, "People", "csv", "name,city\nAlice,Bern\nBob,Basel"));
    }

    private JsonNode definition() {
        return objectMapper.readTree(objectMapper.writeValueAsString(definitionService.build(BRANCH)));
    }

    private static JsonNode find(JsonNode array, String field, String value) {
        return StreamSupport.stream(array.spliterator(), false)
                .filter(n -> n.get(field).asString().equals(value))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no " + field + "=" + value + " in " + array));
    }

    @Test
    void holdsTheBranchsPagesWithTheirWidgetsAndWorkflows() {
        JsonNode definition = definition();

        assertEquals(1, definition.get("version").asInt());
        assertEquals("Test Application", definition.get("app").get("name").asString());

        JsonNode page = find(definition.get("pages"), "name", "About");
        assertEquals("/about", page.get("path").asString());
        assertTrue(page.has("layout") && !page.get("layout").asBoolean());

        JsonNode components = page.get("components");
        assertEquals(2, components.size(), "containers hold their children");
        JsonNode child = components.get(0).get("children").get(0);
        assertEquals("Hi", child.get("props").get("text").asString());
        assertTrue(child.get("props").has("color"), "props are completed with their type's defaults");
        assertEquals("Click Me", components.get(1).get("props").get("label").asString());

        JsonNode workflow = page.get("workflow");
        assertEquals(2, workflow.get("nodes").size());
        JsonNode action = find(workflow.get("nodes"), "type", "Action");
        assertEquals("Bye", action.get("props").get("config").get("text").asString());
        assertEquals("out", workflow.get("edges").get(0).get("sourcePort").asString());
    }

    @Test
    void embedsTheDataWithAFingerprint() {
        JsonNode definition = definition();

        JsonNode people = find(definition.get("dataSources"), "name", "People");
        assertEquals("[\"name\",\"city\"]", people.get("columns").toString());
        assertEquals("[[\"Alice\",\"Bern\"],[\"Bob\",\"Basel\"]]", people.get("rows").toString());
        assertTrue(definition.get("dataRevision").asString().matches("[0-9a-f]{16}"));
        assertEquals(definition.get("dataRevision"), definition().get("dataRevision"), "same data, same revision");
    }

    @Test
    void downloadsTheAppAsOneHtmlFile() {
        ResponseEntity<byte[]> response = exportController.exportApp(BRANCH, "html");
        String html = new String(response.getBody(), StandardCharsets.UTF_8);

        assertEquals("attachment; filename=\"test-application.html\"", response.getHeaders().getFirst("Content-Disposition"));
        assertTrue(html.contains("<title>Test Application</title>"));
        assertTrue(html.contains("\"name\":\"About\""));
    }

    @Test
    void rejectsUnknownBranchesAndFormats() {
        assertThrows(BranchNotFoundException.class, () -> definitionService.build(424242L));
        assertThrows(IllegalArgumentException.class, () -> exportController.exportApp(BRANCH, "pdf"));
    }
}
