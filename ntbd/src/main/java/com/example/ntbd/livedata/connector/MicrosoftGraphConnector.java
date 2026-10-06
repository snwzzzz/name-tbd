package com.example.ntbd.livedata.connector;

import com.example.ntbd.Exception.ConnectorException;
import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.livedata.oauth.AccessTokens;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Microsoft 365 through Microsoft Graph, signed in with OAuth ({@link AccessTokens}). Two kinds of source
 * (source setting {@code type}):
 * <ul>
 *   <li>{@code excel}: a table in an Excel workbook on OneDrive or SharePoint. Settings: {@code file} (the
 *       workbook's path in the user's OneDrive, e.g. "/Documents/orders.xlsx", or {@code driveId} +
 *       {@code itemId}) and {@code table} (the Excel table's name). Excel tables have no row ids, so the source
 *       needs a key column; a row is found by its key, then changed by its position at that moment.</li>
 *   <li>{@code list}: a SharePoint list. Settings: {@code site} (e.g. "contoso.sharepoint.com:/sites/sales")
 *       and {@code list} (its name or id). Rows are list items, identified by their item id.</li>
 * </ul>
 * Many organizations require an administrator to consent to Sites.ReadWrite.All before people can connect.
 */
@Component
public class MicrosoftGraphConnector implements DataConnector {

    private final AccessTokens tokens;
    private final RestClient client;
    private final String api;

    public MicrosoftGraphConnector(AccessTokens tokens, RestClient.Builder liveDataHttp,
                                   @Value("${app.data.microsoft.graph-api:https://graph.microsoft.com/v1.0}") String api) {
        this.tokens = tokens;
        this.client = liveDataHttp.build();
        this.api = api.replaceAll("/+$", "");
    }

    @Override
    public Set<String> kinds() {
        return Set.of("msgraph");
    }

    @Override
    public void test(ConnectionRef connection) {
        call(connection, HttpMethod.GET, "/me?$select=id", null, "sign in");
    }

    /** The workbook's tables, or the site's lists. */
    @Override
    public List<String> targets(ConnectionRef connection, Settings partial) {
        if (isList(partial)) {
            if (partial.text("site") == null) return List.of();
            return values(call(connection, HttpMethod.GET, siteBase(connection, partial) + "/lists?$select=displayName", null, "list the lists"))
                    .stream().map(item -> String.valueOf(item.get("displayName"))).toList();
        }
        if (partial.text("file") == null && partial.text("itemId") == null) return List.of();
        return values(call(connection, HttpMethod.GET, workbook(partial) + "/tables?$select=name", null, "list the tables"))
                .stream().map(item -> String.valueOf(item.get("name"))).toList();
    }

    @Override
    public SourceSchema describe(SourceRef source) {
        if (isList(source.settings())) {
            List<ColumnInfo> columns = new ArrayList<>();
            for (Map<String, Object> column : values(call(source.connection(), HttpMethod.GET, list(source) + "/columns", null, "read the list's columns"))) {
                if (Boolean.TRUE.equals(column.get("hidden")) || Boolean.TRUE.equals(column.get("readOnly"))) continue;
                String name = String.valueOf(column.get("name"));
                if (name.equals("ContentType") || name.equals("Attachments")) continue;
                String type = column.containsKey("number") ? "number" : column.containsKey("boolean") ? "boolean"
                        : column.containsKey("dateTime") ? "date" : "text";
                columns.add(new ColumnInfo(name, type));
            }
            return new SourceSchema(columns, null);
        }
        List<String> names = values(call(source.connection(), HttpMethod.GET, table(source) + "/columns?$select=name", null, "read the table's columns"))
                .stream().map(c -> String.valueOf(c.get("name"))).toList();
        String key = source.keyColumn();
        if (key == null) throw new IllegalArgumentException("Excel tables have no row ids: choose a key column (a column with a unique value per row)");
        if (!names.contains(key)) throw new IllegalArgumentException("The table has no column \"" + key + "\"");
        return new SourceSchema(names.stream().map(ColumnInfo::text).toList(), key);
    }

    @Override
    public LiveRows read(SourceRef source) {
        if (isList(source.settings())) {
            List<LiveRow> rows = new ArrayList<>();
            String next = list(source) + "/items?$expand=fields&$top=" + Math.min(999, source.maxRows() + 1);
            boolean more = false;
            while (next != null) {
                Map<String, Object> page = call(source.connection(), HttpMethod.GET, next, null, "read the list");
                for (Map<String, Object> item : valuesOf(page)) rows.add(listRow(item, source.columns()));
                next = page.get("@odata.nextLink") instanceof String link ? link : null;
                if (rows.size() > source.maxRows()) {
                    more = true;
                    break;
                }
            }
            return new LiveRows(source.columns(), rows.subList(0, Math.min(rows.size(), source.maxRows())), more);
        }
        ExcelTable table = excel(source);
        List<LiveRow> rows = new ArrayList<>();
        for (List<String> values : table.rows()) {
            if (rows.size() > source.maxRows()) break;
            rows.add(new LiveRow(values.get(table.keyIndex()), values));
        }
        boolean truncated = rows.size() > source.maxRows();
        return new LiveRows(table.columns(), truncated ? rows.subList(0, source.maxRows()) : rows, truncated);
    }

    @Override
    public Optional<LiveRow> get(SourceRef source, String rowId) {
        if (isList(source.settings())) {
            try {
                return Optional.of(listRow(call(source.connection(), HttpMethod.GET, item(source, rowId) + "?$expand=fields", null, "read the item"),
                        source.columns()));
            } catch (RowNotFoundException e) {
                return Optional.empty();
            }
        }
        ExcelTable table = excel(source);
        return table.indexOf(rowId).map(i -> new LiveRow(rowId, table.rows().get(i)));
    }

    @Override
    public LiveRow insert(SourceRef source, Map<String, String> values) {
        if (isList(source.settings())) {
            Map<String, Object> created = call(source.connection(), HttpMethod.POST, list(source) + "/items",
                    Map.of("fields", fields(source, values)), "add the item");
            return listRow(created, source.columns());
        }
        ExcelTable table = excel(source);
        List<String> row = table.columns().stream().map(c -> values.getOrDefault(c, "")).toList();
        if (row.get(table.keyIndex()).isEmpty()) throw new IllegalArgumentException("A new row needs a value for " + table.columns().get(table.keyIndex()));
        call(source.connection(), HttpMethod.POST, table(source) + "/rows", Map.of("values", List.of(row)), "add the row");
        return new LiveRow(row.get(table.keyIndex()), row);
    }

    @Override
    public LiveRow update(SourceRef source, String rowId, Map<String, String> values) {
        if (isList(source.settings())) {
            call(source.connection(), HttpMethod.PATCH, item(source, rowId) + "/fields", fields(source, values), "change the item");
            return get(source, rowId).orElseThrow(() -> new RowNotFoundException(rowId));
        }
        ExcelTable table = excel(source);
        int index = table.indexOf(rowId).orElseThrow(() -> new RowNotFoundException(rowId));
        List<String> row = new ArrayList<>(table.rows().get(index));
        values.forEach((column, value) -> row.set(table.columns().indexOf(column), value));
        call(source.connection(), HttpMethod.PATCH, table(source) + "/rows/itemAt(index=" + index + ")",
                Map.of("values", List.of(row)), "change the row");
        return new LiveRow(row.get(table.keyIndex()), row);
    }

    @Override
    public void delete(SourceRef source, List<String> rowIds) {
        if (isList(source.settings())) {
            for (String id : rowIds) {
                try {
                    call(source.connection(), HttpMethod.DELETE, item(source, id), null, "delete the item");
                } catch (RowNotFoundException ignored) {
                    // Gone already
                }
            }
            return;
        }
        ExcelTable table = excel(source);
        // From the bottom up, so earlier deletions don't move the later rows
        List<Integer> indexes = rowIds.stream().map(table::indexOf).flatMap(Optional::stream).distinct()
                .sorted(Comparator.reverseOrder()).toList();
        for (int index : indexes) {
            call(source.connection(), HttpMethod.DELETE, table(source) + "/rows/$/itemAt(index=" + index + ")", null, "delete the row");
        }
    }

    // ---- Excel ----

    private record ExcelTable(List<String> columns, List<List<String>> rows, int keyIndex) {
        Optional<Integer> indexOf(String key) {
            for (int i = 0; i < rows.size(); i++) if (rows.get(i).get(keyIndex).equals(key)) return Optional.of(i);
            return Optional.empty();
        }
    }

    private ExcelTable excel(SourceRef source) {
        Map<String, Object> range = call(source.connection(), HttpMethod.GET, table(source) + "/range?$select=text", null, "read the table");
        List<List<String>> all = new ArrayList<>();
        if (range.get("text") instanceof List<?> lines) {
            for (Object line : lines) {
                List<String> cells = new ArrayList<>();
                if (line instanceof List<?> values) values.forEach(v -> cells.add(v == null ? "" : String.valueOf(v)));
                all.add(cells);
            }
        }
        if (all.isEmpty()) throw new ConnectorException("The Excel table has no header row");
        List<String> columns = all.getFirst();
        String key = source.keyColumn();
        int keyIndex = key == null ? -1 : columns.indexOf(key);
        if (keyIndex < 0) throw new IllegalArgumentException("The table has no key column \"" + key + "\"");
        return new ExcelTable(columns, all.subList(1, all.size()), keyIndex);
    }

    private String table(SourceRef source) {
        return workbook(source.settings()) + "/tables/" + segment(source.settings().require("table", "The table"));
    }

    private String workbook(Settings settings) {
        String driveId = settings.text("driveId");
        String itemId = settings.text("itemId");
        if (driveId != null && itemId != null) return "/drives/" + segment(driveId) + "/items/" + segment(itemId) + "/workbook";
        String file = settings.require("file", "The workbook");
        String path = file.startsWith("/") ? file : "/" + file;
        return "/me/drive/root:" + UriUtils.encodePath(path, StandardCharsets.UTF_8) + ":/workbook";
    }

    // ---- SharePoint lists ----

    private static boolean isList(Settings settings) {
        return "list".equals(settings.text("type"));
    }

    private String siteBase(ConnectionRef connection, Settings settings) {
        String site = settings.require("site", "The site");
        if (site.startsWith("https://")) {
            URI uri = URI.create(site);
            site = uri.getHost() + ":" + uri.getPath();
        }
        return "/sites/" + UriUtils.encodePath(site, StandardCharsets.UTF_8);
    }

    private String list(SourceRef source) {
        return siteBase(source.connection(), source.settings()) + "/lists/" + segment(source.settings().require("list", "The list"));
    }

    private String item(SourceRef source, String id) {
        return list(source) + "/items/" + segment(id);
    }

    private static LiveRow listRow(Map<String, Object> item, List<String> columns) {
        Map<?, ?> fields = item.get("fields") instanceof Map<?, ?> map ? map : Map.of();
        List<String> values = columns.stream().map(c -> fields.get(c) == null ? "" : String.valueOf(fields.get(c))).toList();
        return new LiveRow(String.valueOf(item.get("id")), values);
    }

    /** List item fields as JSON: numbers and booleans as such where the column is one. */
    private static Map<String, Object> fields(SourceRef source, Map<String, String> values) {
        Map<String, String> types = source.settings().map("columnTypes");
        Map<String, Object> fields = new LinkedHashMap<>();
        values.forEach((column, value) -> {
            String type = types.getOrDefault(column, "text");
            if (value.isEmpty() && !type.equals("text")) fields.put(column, null);
            else if (type.equals("number")) {
                try {
                    fields.put(column, new java.math.BigDecimal(value));
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException(column + " must be a number");
                }
            } else if (type.equals("boolean")) fields.put(column, Boolean.parseBoolean(value));
            else fields.put(column, value);
        });
        return fields;
    }

    // ---- Requests ----

    private static String segment(String value) {
        return UriUtils.encodePathSegment(value, StandardCharsets.UTF_8);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> valuesOf(Map<String, Object> page) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (page.get("value") instanceof List<?> list) for (Object item : list) if (item instanceof Map<?, ?> map) result.add((Map<String, Object>) map);
        return result;
    }

    private static List<Map<String, Object>> values(Map<String, Object> page) {
        return valuesOf(page);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> call(ConnectionRef connection, HttpMethod method, String pathOrUrl, Object body, String what) {
        String token = tokens.accessToken(connection);
        URI uri = URI.create(pathOrUrl.startsWith("https://") ? pathOrUrl : api + pathOrUrl);
        if (!uri.toString().startsWith(api)) throw new ConnectorException("Microsoft Graph sent a link elsewhere");
        RestClient.RequestBodySpec request = client.method(method).uri(uri)
                .header("Authorization", "Bearer " + token)
                .accept(MediaType.APPLICATION_JSON);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).body(body);
        try {
            Map<String, Object> answer = request.retrieve().body(Map.class);
            return answer == null ? Map.of() : answer;
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            if (status == 401) tokens.forget(connection.id());
            if (status == 404 && method != HttpMethod.POST && pathOrUrl.contains("/items/")) throw new RowNotFoundException(pathOrUrl);
            String reason = switch (status) {
                case 401 -> "the sign-in expired; connect it again";
                case 403 -> "this account may not open it (an administrator may need to consent)";
                case 404 -> "it wasn't found";
                case 429 -> "Microsoft is limiting requests; try again in a minute";
                default -> "Microsoft Graph answered " + status;
            };
            throw new ConnectorException("Microsoft 365 could not " + what + ": " + reason, e);
        }
    }
}
