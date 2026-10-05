package com.example.ntbd.export.definition;

import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.catalog.WidgetCatalogDocument;
import com.example.ntbd.content.BranchContent;
import com.example.ntbd.content.BranchContent.DataSourceContent;
import com.example.ntbd.content.BranchContent.NodeContent;
import com.example.ntbd.content.BranchContent.WidgetContent;
import com.example.ntbd.content.BranchContent.WorkflowContent;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Which columns of each data source an app uses, so an export that embeds data carries only those (embedded
 * data can be read by anyone who has the file). It errs on the side of keeping columns: a column is kept if
 * <ul>
 *   <li>a widget shows or edits it (column, columns and field props; a table or detail section without a
 *       column list shows them all; the add/edit row form of a table action shows them all);</li>
 *   <li>a workflow writes it (create/update row values);</li>
 *   <li>its name appears anywhere in the app's settings (expressions, texts), e.g. {@code row.email},
 *       {@code orders.selectedRow["e-mail"]};</li>
 *   <li>or a whole row or list of rows is used where its fields can't be told apart: {@code data.orders},
 *       {@code table1.rows}, {@code table1.selectedRows}, a {@code selectedRow} or {@code event.row} used
 *       without naming a field. Then all of that source's columns are kept (for unnamed ones: of every source
 *       the page's or flow's widgets show).</li>
 * </ul>
 * Each source also says why all its columns were kept, so the export dialog can show it.
 */
public final class ColumnUsage {

    /** A source's used columns; {@code allBecause}: why every column is kept (null: only {@code columns}). */
    public record Used(Set<String> columns, String allBecause) {
        public boolean all() {
            return allBecause != null;
        }

        public boolean uses(String column) {
            return all() || columns.contains(column);
        }
    }

    private static final Pattern WORD = Pattern.compile("[\\p{L}_$][\\p{L}\\p{N}_$]*");
    private static final Pattern QUOTED = Pattern.compile("\"((?:[^\"\\\\]|\\\\.)*)\"|'((?:[^'\\\\]|\\\\.)*)'");
    private static final Pattern DATA_REF = Pattern.compile("\\bdata\\s*\\.\\s*([\\p{L}_$][\\p{L}\\p{N}_$]*)|\\bdata\\s*\\[\\s*[\"']([^\"']+)[\"']\\s*]");
    private static final Pattern WIDGET_ROWS = Pattern.compile("([\\p{L}_$][\\p{L}\\p{N}_$]*)\\s*\\.\\s*(rows|selectedRows)\\b");
    private static final Pattern WIDGET_ROW = Pattern.compile("([\\p{L}_$][\\p{L}\\p{N}_$]*)\\s*\\.\\s*selectedRow\\b(?!\\s*(\\.|\\[|\\?\\.))");
    private static final Pattern BARE_ROW = Pattern.compile("\\b(event\\s*\\.\\s*row|row)\\b(?!\\s*(\\.|\\[|\\?\\.|\\())");
    private static final Set<String> ROW_FORMS = Set.of("add_row", "edit_row");

    private final Map<Long, Set<String>> used = new HashMap<>();
    private final Map<Long, String> all = new HashMap<>();
    private final Map<Long, DataSourceContent> sources = new LinkedHashMap<>();

    private ColumnUsage() {
    }

    /** The columns each data source of the content uses, by data source id. */
    public static Map<Long, Used> of(BranchContent content, WidgetCatalog catalog, ObjectMapper objectMapper) {
        ColumnUsage usage = new ColumnUsage();
        content.dataSources().forEach(s -> usage.sources.put(s.id(), s));
        usage.analyze(content, catalog, objectMapper);
        Map<Long, Used> result = new LinkedHashMap<>();
        usage.sources.keySet().forEach(id -> result.put(id,
                new Used(usage.used.getOrDefault(id, Set.of()), usage.all.get(id))));
        return result;
    }

    private void analyze(BranchContent content, WidgetCatalog catalog, ObjectMapper objectMapper) {
        Map<Long, WidgetContent> widgets = new HashMap<>();
        Map<String, Long> sourceByWidgetName = new HashMap<>();
        Map<Long, Set<Long>> sourcesByPage = new HashMap<>();
        Map<Long, String> widgetNames = new HashMap<>();
        List<String> texts = new ArrayList<>();

        for (BranchContent.PageContent page : content.pages()) {
            for (WidgetContent widget : page.widgets()) {
                widgets.put(widget.id(), widget);
                Long source = sourceOf(widget);
                String name = widget.props().get("name");
                if (name != null) widgetNames.put(widget.id(), name);
                if (source != null) {
                    sourcesByPage.computeIfAbsent(page.id(), p -> new HashSet<>()).add(source);
                    if (name != null) sourceByWidgetName.put(name, source);
                }
            }
        }

        // Widgets' column settings, and the texts of everything else
        for (WidgetContent widget : widgets.values()) {
            Long source = sourceOf(widget);
            Map<String, String> types = propTypes(catalog, widget.type());
            for (Map.Entry<String, String> prop : widget.props().entrySet()) {
                String type = types.get(prop.getKey());
                String value = prop.getValue();
                if (value == null) continue;
                if ("column".equals(type) || "field".equals(type)) {
                    if (source != null) use(source, value.trim());
                    else useEverywhere(value.trim());
                } else if ("columns".equals(type)) {
                    List<String> columns = parseList(objectMapper, value);
                    if (source == null) continue;
                    if (columns.isEmpty() && (widget.type().equals("table") || widget.type().equals("detail"))) {
                        useAll(source, "a " + widget.type() + " shows all its columns");
                    } else {
                        columns.forEach(c -> use(source, c));
                    }
                } else if (!"dataSource".equals(type)) {
                    texts.add(value);
                }
            }
            // A table or detail section with no column list at all shows every column too
            if (source != null && (widget.type().equals("table") || widget.type().equals("detail"))
                    && !widget.props().containsKey("columns") && "[]".equals(defaultOf(catalog, widget.type(), "columns"))) {
                useAll(source, "a " + widget.type() + " shows all its columns");
            }
        }

        for (WorkflowContent workflow : content.workflows()) {
            Set<Long> flowSources = new HashSet<>(sourcesByPage.getOrDefault(workflow.pageId(), Set.of()));
            List<String> flowTexts = new ArrayList<>();
            for (NodeContent node : workflow.nodes()) {
                Map<String, Object> props = node.props() == null ? Map.of() : node.props();
                Object config = props.get("config");
                if (config instanceof Map<?, ?> map) {
                    Long source = number(map.get("dataSourceId"));
                    if (source != null) {
                        flowSources.add(source);
                        // create/update row: the columns it writes
                        if (map.get("values") instanceof List<?> values) {
                            for (Object value : values) {
                                if (value instanceof Map<?, ?> v && v.get("column") != null) use(source, String.valueOf(v.get("column")));
                            }
                        }
                    }
                    Long tableId = number(map.get("tableId"));
                    WidgetContent table = tableId == null ? null : widgets.get(tableId);
                    Long tableSource = table == null ? null : sourceOf(table);
                    if (tableSource != null) {
                        flowSources.add(tableSource);
                        if (ROW_FORMS.contains(String.valueOf(map.get("operation")))) {
                            useAll(tableSource, "a table action's row form shows all columns");
                        }
                    }
                }
                Object element = props.get("elementId");
                Long elementSource = element == null ? null : sourceOfWidget(widgets, number(element));
                if (elementSource != null) flowSources.add(elementSource);
                collectTexts(props, flowTexts);
            }
            for (String text : flowTexts) {
                texts.add(text);
                if (expressionParts(text).stream().anyMatch(part -> BARE_ROW.matcher(part).find())) {
                    flowSources.forEach(s -> useAll(s, "a flow uses a whole row"));
                }
            }
        }

        Map<String, Long> sourceByName = new HashMap<>();
        sources.values().forEach(s -> sourceByName.put(s.name(), s.id()));
        for (String text : texts) {
            Matcher data = DATA_REF.matcher(text);
            while (data.find()) {
                Long source = sourceByName.get(data.group(1) != null ? data.group(1) : data.group(2));
                if (source != null) useAll(source, "an expression uses data." + sources.get(source).name());
            }
            Matcher rows = WIDGET_ROWS.matcher(text);
            while (rows.find()) {
                Long source = sourceByWidgetName.get(rows.group(1));
                if (source != null) useAll(source, "an expression uses " + rows.group(1) + "." + rows.group(2));
            }
            Matcher row = WIDGET_ROW.matcher(text);
            while (row.find()) {
                Long source = sourceByWidgetName.get(row.group(1));
                if (source != null) useAll(source, "an expression uses " + row.group(1) + ".selectedRow as a whole");
            }
            mentioned(text).forEach(this::useEverywhere);
        }
        // Rows are found by their key: it travels along
        sources.values().forEach(s -> {
            if (s.keyColumn() != null) use(s.id(), s.keyColumn());
        });
    }

    private static final Pattern TEMPLATE = Pattern.compile("\\{\\{(.*?)}}", Pattern.DOTALL);

    /** The parts of a text that may be expressions: its {{ templates }}, or all of it when it has no spaces (e.g. event.row). */
    static List<String> expressionParts(String text) {
        List<String> parts = new ArrayList<>();
        Matcher template = TEMPLATE.matcher(text);
        while (template.find()) parts.add(template.group(1));
        if (parts.isEmpty() && !text.isBlank() && text.trim().chars().noneMatch(Character::isWhitespace)) parts.add(text.trim());
        return parts;
    }

    /** Words and quoted texts in a text (expressions name columns as fields or as ["quoted names"]). */
    static Set<String> mentioned(String text) {
        Set<String> words = new LinkedHashSet<>();
        Matcher word = WORD.matcher(text);
        while (word.find()) words.add(word.group());
        Matcher quoted = QUOTED.matcher(text);
        while (quoted.find()) words.add(quoted.group(1) != null ? quoted.group(1) : quoted.group(2));
        return words;
    }

    private void useEverywhere(String column) {
        for (DataSourceContent source : sources.values()) {
            if (source.columns().contains(column)) use(source.id(), column);
        }
    }

    private void use(Long source, String column) {
        if (sources.containsKey(source) && !column.isEmpty()) used.computeIfAbsent(source, s -> new LinkedHashSet<>()).add(column);
    }

    private void useAll(Long source, String because) {
        if (sources.containsKey(source)) all.putIfAbsent(source, because);
    }

    private static Long sourceOf(WidgetContent widget) {
        return number(widget.props().get("dataSourceId"));
    }

    private static Long sourceOfWidget(Map<Long, WidgetContent> widgets, Long id) {
        WidgetContent widget = id == null ? null : widgets.get(id);
        return widget == null ? null : sourceOf(widget);
    }

    private static Map<String, String> propTypes(WidgetCatalog catalog, String type) {
        Map<String, String> types = new HashMap<>();
        catalog.widget(type).ifPresent(w -> w.props().forEach(p -> types.put(p.key(), p.type())));
        return types;
    }

    private static String defaultOf(WidgetCatalog catalog, String type, String key) {
        return catalog.widget(type).flatMap(w -> w.props().stream().filter(p -> p.key().equals(key)).findFirst())
                .map(WidgetCatalogDocument.Prop::defaultValue).orElse(null);
    }

    private static void collectTexts(Object value, List<String> texts) {
        if (value instanceof String text) texts.add(text);
        else if (value instanceof Map<?, ?> map) map.values().forEach(v -> collectTexts(v, texts));
        else if (value instanceof List<?> list) list.forEach(v -> collectTexts(v, texts));
    }

    private static List<String> parseList(ObjectMapper objectMapper, String value) {
        try {
            Object parsed = objectMapper.readValue(value, Object.class);
            if (parsed instanceof List<?> list) return list.stream().map(String::valueOf).toList();
        } catch (RuntimeException ignored) {
            // Not a JSON list: one column name
        }
        return value.isBlank() ? List.of() : List.of(value.trim());
    }

    private static Long number(Object value) {
        if (value instanceof Number n) return n.longValue();
        if (value == null) return null;
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
