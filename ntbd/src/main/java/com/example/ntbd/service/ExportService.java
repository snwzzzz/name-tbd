package com.example.ntbd.service;

import com.example.ntbd.dto.EdgeDto;
import com.example.ntbd.dto.NodeDto;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.dto.WorkflowDto;
import com.example.ntbd.export.WidgetHtmlRendererRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static com.example.ntbd.export.WidgetHtml.escapeHtml;

/**
 * Exports a page as one self-contained HTML file: the layout as it looks on the editor's artboard,
 * plus the page's workflow and a small runtime that plays it (the same rules as the editor's preview).
 */
@Service
@RequiredArgsConstructor
public class ExportService {

    /** The editor's artboard: 24 × 18 cells of 60 × 45 px. */
    private static final int ROOT_COLS = 24;
    private static final int ROOT_ROWS = 18;
    private static final int ARTBOARD_W = 1440;
    private static final int ARTBOARD_H = 810;

    private static final ObjectMapper JSON = new ObjectMapper();

    private final PageService pageService;
    private final UiComponentService uiComponentService;
    private final WorkflowService workflowService;
    private final NodeService nodeService;
    private final EdgeService edgeService;
    private final WidgetHtmlRendererRegistry renderers;

    public String exportPageToHtml(Long pageId) {
        PageDto page = pageService.findById(pageId);
        List<UiComponentDto> components = uiComponentService.findByPageId(pageId);

        try {
            Map<Long, List<UiComponentDto>> childrenMap = components.stream()
                    .filter(c -> c.parentId() != null)
                    .collect(Collectors.groupingBy(UiComponentDto::parentId));

            StringBuilder body = new StringBuilder();
            components.stream()
                    .filter(c -> c.parentId() == null)
                    .forEach(root -> body.append(renderComponent(root, childrenMap)));

            String template = """
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>{{TITLE}}</title>
                        <style>
                    {{STYLES}}
                        </style>
                    </head>
                    <body>
                        <main class="stage" id="stage">
                    {{BODY}}    </main>
                        <script type="application/json" id="workflow-data">{{WORKFLOW}}</script>
                        <script>
                    {{RUNTIME}}
                        </script>
                    </body>
                    </html>
                    """;
            return fill(template, Map.of(
                    "TITLE", escapeHtml(page.name()),
                    "STYLES", STYLES + renderers.styles(),
                    "BODY", body.toString(),
                    "WORKFLOW", workflowJson(pageId),
                    "RUNTIME", RUNTIME));

        } catch (Exception e) {
            throw new RuntimeException("Failed to export page", e);
        }
    }

    /** The page's workflow, reduced to what the runtime needs. Safe to put inside a <script> tag. */
    private String workflowJson(Long pageId) {
        WorkflowDto workflow = workflowService.findOrCreateForPage(pageId);

        List<Map<String, Object>> nodes = nodeService.findByWorkflowId(workflow.id()).stream()
                .sorted(Comparator.comparing(NodeDto::id))
                .map(n -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", String.valueOf(n.id()));
                    m.put("type", n.type());
                    m.put("y", n.y() != null ? n.y() : 0);
                    m.put("props", n.props() != null ? n.props() : Map.of());
                    return m;
                })
                .toList();

        List<Map<String, Object>> edges = edgeService.findByWorkflowId(workflow.id()).stream()
                .sorted(Comparator.comparing(EdgeDto::id))
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("from", String.valueOf(e.sourceNodeId()));
                    m.put("to", String.valueOf(e.targetNodeId()));
                    m.put("port", e.sourcePort() != null ? e.sourcePort() : "out");
                    return m;
                })
                .toList();

        String json = JSON.writeValueAsString(Map.of("nodes", nodes, "edges", edges));
        // "</script>" or "<!--" inside a string must not end the script element
        return json.replace("<", "\\u003c");
    }

    private String renderComponent(UiComponentDto c, Map<Long, List<UiComponentDto>> childrenMap) {
        int x = c.x() != null ? c.x().intValue() : 0;
        int y = c.y() != null ? c.y().intValue() : 0;
        int w = c.w() != null ? c.w().intValue() : 1;
        int h = c.h() != null ? c.h().intValue() : 1;

        // CSS Grid is 1-indexed
        String placement = "grid-column: " + (x + 1) + " / " + (x + 1 + w) + "; "
                + "grid-row: " + (y + 1) + " / " + (y + 1 + h) + ";";

        List<UiComponentDto> children = childrenMap.get(c.id());
        if (children != null && !children.isEmpty()) {
            // Nested grids have exactly as many columns and rows as the container's size (like in the editor)
            StringBuilder childrenHtml = new StringBuilder();
            children.forEach(child -> childrenHtml.append(renderComponent(child, childrenMap)));
            return "<div class=\"widget-container\" style=\"" + placement
                    + " grid-template-columns: repeat(" + w + ", 1fr); grid-template-rows: repeat(" + h + ", 1fr);\">\n"
                    + childrenHtml + "</div>\n";
        }

        String type = c.type() != null ? c.type() : "default";
        Map<String, Object> props = c.props() != null ? c.props() : Map.of();
        String id = String.valueOf(c.id());

        String inner = renderers.getRenderer(type).render(id, props);

        return "<div class=\"cell\" style=\"" + placement + "\">\n" + inner + "\n</div>\n";
    }

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)}}");

    /** Fill {{NAME}} placeholders in one pass, so inserted content is never scanned for placeholders itself. */
    private static String fill(String template, Map<String, String> values) {
        return PLACEHOLDER.matcher(template)
                .replaceAll(m -> Matcher.quoteReplacement(values.getOrDefault(m.group(1), m.group())));
    }

    private static final String STYLES = """
            :root {
                --page-bg: #e0e0e0;
                --surface: #ffffff;
                --text: #1f1f1f;
                --muted: #666666;
                --border: #d9d9d9;
            }
            @media (prefers-color-scheme: dark) {
                :root {
                    --page-bg: #252525;
                    --surface: #1c1c1c;
                    --text: #f5f5f5;
                    --muted: #b5b5b5;
                    --border: #3a3a3a;
                }
            }
            *, *::before, *::after { box-sizing: border-box; }
            html, body { margin: 0; height: 100%; }
            body {
                overflow: hidden;
                background: var(--page-bg);
                color: var(--text);
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-weight: 500;
            }
            /* The artboard at its editor size, scaled to fit the window (see the script) */
            .stage {
                position: absolute;
                left: 0;
                top: 0;
                width: {{W}}px;
                height: {{H}}px;
                display: grid;
                grid-template-columns: repeat({{COLS}}, 1fr);
                grid-template-rows: repeat({{ROWS}}, 1fr);
                background: var(--surface);
                border-radius: 2px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.05);
                transform-origin: 0 0;
            }
            .cell { padding: 4px; min-width: 0; min-height: 0; }
            .cell > * { width: 100%; height: 100%; border-radius: 3px; overflow: hidden; }
            .widget-container { display: grid; min-width: 0; min-height: 0; }
            .widget-button {
                margin: 0;
                padding: 0 8px;
                border: none;
                color: #fff;
                font: inherit;
                font-size: 0.875rem;
                font-weight: 600;
                white-space: nowrap;
                text-overflow: ellipsis;
                cursor: pointer;
                transition: filter 0.12s ease, transform 0.06s ease;
            }
            .widget-button:hover { filter: brightness(1.08); }
            .widget-button:active { filter: brightness(0.92); transform: translateY(1px); }
            .widget-button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
            .widget-label { display: flex; }
            .widget-label-text { flex: 1; padding: 0.5rem; white-space: pre-wrap; word-break: break-word; }
            .widget-form { display: flex; flex-direction: column; gap: 10px; }
            .widget-form input {
                padding: 8px;
                border: 1px solid var(--border);
                border-radius: 4px;
                background: var(--surface);
                color: var(--text);
                font: inherit;
            }
            .widget-text {
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--border);
                color: var(--muted);
            }
            """
            .replace("{{W}}", String.valueOf(ARTBOARD_W))
            .replace("{{H}}", String.valueOf(ARTBOARD_H))
            .replace("{{COLS}}", String.valueOf(ROOT_COLS))
            .replace("{{ROWS}}", String.valueOf(ROOT_ROWS));

    /**
     * Plays the page's workflow, following the editor preview's rules:
     * connected nodes run once per trigger; actions on the same label take turns, top to bottom;
     * a chained action starts once the one before it has finished (its reset included).
     */
    private static final String RUNTIME = """
            (function () {
              // Fit the artboard into the window, centered
              var stage = document.getElementById('stage');
              function fit() {
                var s = Math.min(window.innerWidth / {{W}}, window.innerHeight / {{H}});
                stage.style.transform = 'translate(' + (window.innerWidth - {{W}} * s) / 2 + 'px,'
                  + (window.innerHeight - {{H}} * s) / 2 + 'px) scale(' + s + ')';
              }
              window.addEventListener('resize', fit);
              fit();

              var graph = JSON.parse(document.getElementById('workflow-data').textContent);
              var byId = {};
              graph.nodes.forEach(function (n) { byId[n.id] = n; });

              // Each label's own text, to go back to after a reset
              var original = {};
              document.querySelectorAll('.widget-label[data-component-id]').forEach(function (el) {
                original[el.dataset.componentId] = el.querySelector('.widget-label-text').textContent;
              });

              var queues = {};

              function next(node, port) {
                return graph.edges
                  .filter(function (e) { return e.from === node.id && e.port === port; })
                  .map(function (e) { return byId[e.to]; })
                  .filter(Boolean)
                  .sort(function (a, b) { return a.y - b.y; });
              }

              function runNext(node, visited) {
                next(node, 'out').forEach(function (child) {
                  if (visited[child.id]) return;
                  visited[child.id] = true;
                  if (child.type === 'Action') {
                    execute(child).then(function () { runNext(child, visited); });
                  } else {
                    console.warn('[workflow] ' + child.type + ' nodes are not supported yet; stopping this branch.');
                  }
                });
              }

              function labelText(id) {
                var el = document.querySelector('.widget-label[data-component-id="' + id + '"] .widget-label-text');
                return el;
              }

              function execute(node) {
                var props = node.props || {};
                if (props.actionType !== 'set_text') {
                  console.warn('[workflow] Unknown action "' + props.actionType + '"');
                  return Promise.resolve();
                }
                var config = props.config || {};
                var target = config.targetId != null ? String(config.targetId) : '';
                if (!target) return Promise.resolve();

                var run = (queues[target] || Promise.resolve()).then(function () {
                  return new Promise(function (resolve) {
                    var el = labelText(target);
                    if (!el) return resolve();
                    el.textContent = config.text != null ? config.text : '';
                    if (!config.resetEnabled) return resolve();
                    var seconds = Math.max(0, Number(config.resetAfterSeconds) || 0);
                    setTimeout(function () {
                      el.textContent = original[target] != null ? original[target] : '';
                      resolve();
                    }, seconds * 1000);
                  });
                });
                queues[target] = run;
                return run;
              }

              function triggers(match) {
                return graph.nodes.filter(function (n) { return n.type === 'Trigger' && match(n.props || {}); });
              }

              document.addEventListener('click', function (e) {
                var button = e.target.closest('.widget-button[data-component-id]');
                if (!button) return;
                var id = button.dataset.componentId;
                triggers(function (p) { return String(p.elementId) === id && p.eventName === 'element_click'; })
                  .forEach(function (t) { runNext(t, {}); });
              });

              // Triggers that aren't tied to a button run when the page loads
              triggers(function (p) { return !p.elementId && (p.triggerType || 'page_load') === 'page_load'; })
                .forEach(function (t) { runNext(t, {}); });
            })();
            """
            .replace("{{W}}", String.valueOf(ARTBOARD_W))
            .replace("{{H}}", String.valueOf(ARTBOARD_H));
}
