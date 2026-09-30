package com.example.ntbd.service;

import com.example.ntbd.dto.EdgeDto;
import com.example.ntbd.dto.NodeDto;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.dto.WorkflowDto;
import com.example.ntbd.export.WidgetHtmlRendererRegistry;
import com.example.ntbd.export.renderers.ButtonRenderer;
import com.example.ntbd.export.renderers.FormRenderer;
import com.example.ntbd.export.renderers.LabelRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExportServiceTest {

    @Mock private PageService pageService;
    @Mock private UiComponentService uiComponentService;
    @Mock private WorkflowService workflowService;
    @Mock private NodeService nodeService;
    @Mock private EdgeService edgeService;
    @Spy private WidgetHtmlRendererRegistry renderers =
            new WidgetHtmlRendererRegistry(List.of(new ButtonRenderer(), new LabelRenderer(), new FormRenderer()));

    @InjectMocks
    private ExportService exportService;

    @BeforeEach
    void setUp() {
        when(pageService.findById(1L)).thenReturn(new PageDto(1L, "Home <Start>", "/home", 1L));
        when(uiComponentService.findByPageId(1L)).thenReturn(List.of(
                new UiComponentDto(10L, 1L, "button", Map.of("label", "Click “Me”", "color", "#8b2f55"), null, null, 0.0, 0.0, 2.0, 1.0),
                new UiComponentDto(11L, 1L, "label", Map.of("text", "Hello <b>", "color", "red;} body{display:none"), null, null, 2.0, 0.0, 4.0, 1.0)
        ));
        when(workflowService.findOrCreateForPage(1L)).thenReturn(new WorkflowDto(5L, "wf", null, null, null, 1L));
        when(nodeService.findByWorkflowId(5L)).thenReturn(List.of(
                new NodeDto(100L, 5L, "Trigger", Map.of("triggerType", "element_click", "elementId", "10", "eventName", "element_click"), 100.0, 100.0, null, null),
                new NodeDto(101L, 5L, "Action", Map.of("actionType", "set_text",
                        "config", Map.of("targetId", "11", "text", "</script><script>alert(1)</script>", "resetEnabled", true, "resetAfterSeconds", 3)),
                        400.0, 100.0, null, null)
        ));
        when(edgeService.findByWorkflowId(5L)).thenReturn(List.of(new EdgeDto(200L, 100L, 101L, "out", null, null)));
    }

    @Test
    void rendersWidgetsWithTheirPropsEscaped() {
        String html = exportService.exportPageToHtml(1L);

        assertTrue(html.contains("<title>Home &lt;Start&gt;</title>"));
        assertTrue(html.contains("data-component-id=\"10\""));
        assertTrue(html.contains("background: #8b2f55;"));
        assertTrue(html.contains(">Click “Me”</button>"));
        assertTrue(html.contains("Hello &lt;b&gt;"));
        // A value that isn't a plain color never reaches the style attribute
        assertFalse(html.contains("display:none"));
    }

    @Test
    void embedsTheWorkflowSoTextCannotBreakOutOfTheScript() {
        String html = exportService.exportPageToHtml(1L);

        assertTrue(html.contains("id=\"workflow-data\""));
        assertTrue(html.contains("\"actionType\":\"set_text\""));
        assertTrue(html.contains("\"from\":\"100\",\"to\":\"101\",\"port\":\"out\""));
        assertFalse(html.contains("</script><script>alert(1)"));
        assertTrue(html.contains("\\u003c/script>"));
    }
}
