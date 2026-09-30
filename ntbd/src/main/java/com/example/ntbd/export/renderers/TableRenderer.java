package com.example.ntbd.export.renderers;

import com.example.ntbd.Exception.DataSourceNotFoundException;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.export.WidgetHtmlRenderer;
import com.example.ntbd.service.DataSourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.example.ntbd.export.WidgetHtml.boolProp;
import static com.example.ntbd.export.WidgetHtml.escapeHtml;
import static com.example.ntbd.export.WidgetHtml.intProp;
import static com.example.ntbd.export.WidgetHtml.prop;

/**
 * The data table widget: its data source's rows are baked into the page as they are at export
 * time. Uses the same rules as the editor's table widget (see table-widget.ts).
 */
@Component
@RequiredArgsConstructor
public class TableRenderer implements WidgetHtmlRenderer {

    static final int DEFAULT_MAX_ROWS = 10;
    private static final int MAX_ROWS_LIMIT = 1000;
    private static final ObjectMapper JSON = new ObjectMapper();

    private final DataSourceService dataSourceService;

    @Override
    public Set<String> widgetTypes() {
        return Set.of("table");
    }

    @Override
    public String render(String id, Map<String, Object> props) {
        StringBuilder html = new StringBuilder("<div class=\"widget-table\" data-component-id=\"" + id + "\">");
        String title = prop(props, "title");
        if (title != null && !title.isBlank()) {
            html.append("<div class=\"widget-table-title\">").append(escapeHtml(title)).append("</div>");
        }
        html.append(body(props));
        return html.append("</div>").toString();
    }

    private String body(Map<String, Object> props) {
        Long dataSourceId = parseId(prop(props, "dataSourceId"));
        if (dataSourceId == null) return message("No data source selected");

        DataSourceDto source;
        try {
            source = dataSourceService.findById(dataSourceId);
        } catch (DataSourceNotFoundException e) {
            return message("Data source not found");
        }

        List<Integer> columns = visibleColumns(source.columns(), parseColumns(prop(props, "columns")));
        int maxRows = Math.clamp(intProp(props, "maxRows", DEFAULT_MAX_ROWS), 0, MAX_ROWS_LIMIT);
        List<List<String>> rows = source.rows().subList(0, Math.min(maxRows, source.rows().size()));
        boolean striped = boolProp(props, "striped", false);

        StringBuilder html = new StringBuilder("<div class=\"widget-table-scroll\"><table")
                .append(striped ? " class=\"striped\"" : "").append(">");
        if (boolProp(props, "showHeader", true)) {
            html.append("<thead><tr>");
            columns.forEach(i -> html.append("<th>").append(escapeHtml(source.columns().get(i))).append("</th>"));
            html.append("</tr></thead>");
        }
        html.append("<tbody>");
        for (List<String> row : rows) {
            html.append("<tr>");
            columns.forEach(i -> html.append("<td>").append(escapeHtml(i < row.size() ? row.get(i) : "")).append("</td>"));
            html.append("</tr>");
        }
        html.append("</tbody></table></div>");

        int hidden = source.rows().size() - rows.size();
        if (hidden > 0) html.append("<div class=\"widget-table-more\">+ ").append(hidden).append(" more rows</div>");
        return html.toString();
    }

    /** Indexes of the columns to show: the chosen ones that exist, in their order; all if none are. */
    static List<Integer> visibleColumns(List<String> allColumns, List<String> chosen) {
        List<Integer> indexes = chosen.stream().map(allColumns::indexOf).filter(i -> i >= 0).distinct().toList();
        if (!indexes.isEmpty()) return indexes;
        return java.util.stream.IntStream.range(0, allColumns.size()).boxed().toList();
    }

    /** The chosen column names, stored as a JSON array; anything else counts as none chosen. */
    static List<String> parseColumns(String value) {
        if (value == null || value.isBlank()) return List.of();
        try {
            Object parsed = JSON.readValue(value, Object.class);
            return parsed instanceof List<?> list ? list.stream().map(String::valueOf).toList() : List.of();
        } catch (RuntimeException e) {
            return List.of();
        }
    }

    private static Long parseId(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return (long) Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String message(String text) {
        return "<div class=\"widget-table-message\">" + escapeHtml(text) + "</div>";
    }

    @Override
    public String styles() {
        return """
                .widget-table {
                    display: flex;
                    flex-direction: column;
                    border: 1px solid var(--border);
                    background: var(--surface);
                    font-size: 0.8125rem;
                }
                .widget-table-title { padding: 6px 8px; font-weight: 600; border-bottom: 1px solid var(--border); }
                .widget-table-scroll { flex: 1; overflow: auto; }
                .widget-table table { width: 100%; border-collapse: collapse; }
                .widget-table th, .widget-table td {
                    padding: 4px 8px;
                    text-align: left;
                    white-space: nowrap;
                    border-bottom: 1px solid var(--border);
                }
                .widget-table th { position: sticky; top: 0; background: var(--page-bg); }
                .widget-table table.striped tbody tr:nth-child(even) { background: var(--page-bg); }
                .widget-table-more, .widget-table-message { padding: 4px 8px; color: var(--muted); }
                """;
    }
}
