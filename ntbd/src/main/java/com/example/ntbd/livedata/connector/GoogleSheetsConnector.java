package com.example.ntbd.livedata.connector;

import com.example.ntbd.Exception.ConnectorException;
import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.livedata.oauth.AccessTokens;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A sheet of a Google spreadsheet (Sheets API v4), signed in with OAuth ({@link AccessTokens}).
 * <p>
 * Source settings: {@code spreadsheet} (its id or URL), {@code sheet} (the tab's title; default the first).
 * Row 1 holds the column names, every following row is a data row.
 * <p>
 * Rows are identified by the key column. Without one, the connector keeps its own {@value #ID_COLUMN}
 * column: it adds it (after the last column) when the source is described, and gives rows that people added
 * in the sheet itself an id when it reads them. Rows whose key cell is empty are still shown, as
 * {@code #<row number>}; changing those uses the row number.
 * <p>
 * Values are written as if typed (numbers and dates are recognised), except that text starting with
 * =, +, - or @ is written as text, so app users can't put formulas into the sheet.
 */
@Component
public class GoogleSheetsConnector implements DataConnector {

    static final String ID_COLUMN = "_id";
    private static final Pattern SPREADSHEET_URL = Pattern.compile("/spreadsheets/d/([A-Za-z0-9_-]+)");
    private static final Pattern SPREADSHEET_ID = Pattern.compile("[A-Za-z0-9_-]{20,}");
    private static final Pattern NUMBER = Pattern.compile("-?\\d+(\\.\\d+)?");

    private final AccessTokens tokens;
    private final RestClient client;
    private final String api;

    public GoogleSheetsConnector(AccessTokens tokens, RestClient.Builder liveDataHttp,
                                 @Value("${app.data.google.sheets-api:https://sheets.googleapis.com}") String api) {
        this.tokens = tokens;
        this.client = liveDataHttp.build();
        this.api = api.replaceAll("/+$", "");
    }

    @Override
    public Set<String> kinds() {
        return Set.of("gsheets");
    }

    @Override
    public void test(ConnectionRef connection) {
        tokens.accessToken(connection);
    }

    /** The spreadsheet's sheets (tabs). */
    @Override
    public List<String> targets(ConnectionRef connection, Settings partial) {
        if (partial.text("spreadsheet") == null) return List.of();
        return sheets(connection, spreadsheetId(partial)).stream().map(SheetInfo::title).toList();
    }

    @Override
    public SourceSchema describe(SourceRef source) {
        Sheet sheet = sheet(source);
        List<String> header = sheet.header();
        if (header.isEmpty()) throw new ConnectorException("The sheet \"" + sheet.title() + "\" has no column names in row 1");
        String key = source.keyColumn();
        if (key == null) {
            key = ID_COLUMN;
            if (!header.contains(ID_COLUMN)) {
                // The connector's own row ids, after the last column
                header = new ArrayList<>(header);
                header.add(ID_COLUMN);
                put(source, sheet.title(), "A1:" + column(header.size()) + "1", List.of(header));
                sheet = sheet(source);
                fillMissingIds(source, sheet, header.indexOf(ID_COLUMN));
            }
        } else if (!header.contains(key)) {
            throw new IllegalArgumentException("The sheet \"" + sheet.title() + "\" has no column \"" + key + "\"");
        }
        return new SourceSchema(header.stream().map(name -> new ColumnInfo(name, "text")).toList(), key);
    }

    @Override
    public LiveRows read(SourceRef source) {
        Sheet sheet = sheet(source);
        String key = key(source);
        int keyIndex = sheet.header().indexOf(key);
        if (keyIndex >= 0 && ID_COLUMN.equals(key) && sheet.rows().stream().anyMatch(r -> cell(r, keyIndex).isEmpty())) {
            fillMissingIds(source, sheet, keyIndex);
            sheet = sheet(source);
        }
        List<LiveRow> rows = new ArrayList<>();
        for (int i = 0; i < sheet.rows().size() && rows.size() <= source.maxRows(); i++) {
            List<String> raw = sheet.rows().get(i);
            if (raw.stream().allMatch(String::isEmpty)) continue;
            rows.add(liveRow(sheet, raw, keyIndex, i + 2));
        }
        boolean truncated = rows.size() > source.maxRows();
        return new LiveRows(sheet.header(), truncated ? rows.subList(0, source.maxRows()) : rows, truncated);
    }

    @Override
    public Optional<LiveRow> get(SourceRef source, String rowId) {
        Sheet sheet = sheet(source);
        int keyIndex = sheet.header().indexOf(key(source));
        return rowNumber(sheet, keyIndex, rowId).map(n -> liveRow(sheet, sheet.rows().get(n - 2), keyIndex, n));
    }

    @Override
    public LiveRow insert(SourceRef source, Map<String, String> values) {
        Sheet sheet = sheet(source);
        String key = key(source);
        List<String> row = new ArrayList<>();
        for (String column : sheet.header()) row.add(values.getOrDefault(column, ""));
        int keyIndex = sheet.header().indexOf(key);
        if (keyIndex >= 0 && row.get(keyIndex).isEmpty() && ID_COLUMN.equals(key)) row.set(keyIndex, newId());
        call(source.connection(), "add the row", c -> c.post()
                .uri(URI.create(valuesUri(sheet.spreadsheetId(), range(sheet.title(), "A1")) + ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("values", List.of(row.stream().map(GoogleSheetsConnector::asTyped).toList())))
                .retrieve().toBodilessEntity());
        String id = keyIndex >= 0 && !row.get(keyIndex).isEmpty() ? row.get(keyIndex) : "#" + (sheet.rows().size() + 2);
        return get(source, id).orElse(new LiveRow(id, row));
    }

    @Override
    public LiveRow update(SourceRef source, String rowId, Map<String, String> values) {
        Sheet sheet = sheet(source);
        int keyIndex = sheet.header().indexOf(key(source));
        int number = rowNumber(sheet, keyIndex, rowId).orElseThrow(() -> new RowNotFoundException(rowId));
        List<String> row = new ArrayList<>(sheet.rows().get(number - 2));
        while (row.size() < sheet.header().size()) row.add("");
        // Only the changed cells, so formulas elsewhere in the row stay
        List<Map<String, Object>> data = new ArrayList<>();
        values.forEach((column, value) -> {
            int index = sheet.header().indexOf(column);
            row.set(index, value);
            data.add(Map.of("range", range(sheet.title(), column(index + 1) + number), "values", List.of(List.of(asTyped(value)))));
        });
        if (!data.isEmpty()) {
            call(source.connection(), "change the row", c -> c.post()
                    .uri(URI.create(api + "/v4/spreadsheets/" + sheet.spreadsheetId() + "/values:batchUpdate"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("valueInputOption", "USER_ENTERED", "data", data))
                    .retrieve().toBodilessEntity());
        }
        String id = keyIndex >= 0 && !row.get(keyIndex).isEmpty() ? row.get(keyIndex) : rowId;
        return new LiveRow(id, row.subList(0, sheet.header().size()));
    }

    @Override
    public void delete(SourceRef source, List<String> rowIds) {
        Sheet sheet = sheet(source);
        int keyIndex = sheet.header().indexOf(key(source));
        List<Integer> numbers = rowIds.stream().map(id -> rowNumber(sheet, keyIndex, id)).flatMap(Optional::stream)
                .distinct().sorted(Comparator.reverseOrder()).toList();
        if (numbers.isEmpty()) return;
        // From the bottom up, so earlier deletions don't move the later rows
        List<Map<String, Object>> requests = numbers.stream().map(n -> Map.<String, Object>of("deleteDimension", Map.of(
                "range", Map.of("sheetId", sheet.sheetId(), "dimension", "ROWS", "startIndex", n - 1, "endIndex", n)))).toList();
        call(source.connection(), "delete the rows", c -> c.post()
                .uri(URI.create(api + "/v4/spreadsheets/" + sheet.spreadsheetId() + ":batchUpdate"))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("requests", requests))
                .retrieve().toBodilessEntity());
    }

    // ---- Sheets ----

    private record SheetInfo(long sheetId, String title) {
    }

    /** A sheet as read: its column names (row 1) and its rows (from row 2; row n is rows[n - 2]). */
    private record Sheet(String spreadsheetId, long sheetId, String title, List<String> header, List<List<String>> rows) {
    }

    private Sheet sheet(SourceRef source) {
        String spreadsheetId = spreadsheetId(source.settings());
        List<SheetInfo> sheets = sheets(source.connection(), spreadsheetId);
        String wanted = source.settings().text("sheet");
        SheetInfo info = wanted == null ? sheets.stream().findFirst().orElseThrow(() -> new ConnectorException("The spreadsheet has no sheets"))
                : sheets.stream().filter(s -> s.title().equals(wanted)).findFirst()
                  .orElseThrow(() -> new ConnectorException("The spreadsheet has no sheet \"" + wanted + "\""));
        Map<?, ?> answer = call(source.connection(), "read the sheet", c -> c.get()
                .uri(URI.create(valuesUri(spreadsheetId, range(info.title(), "A1:ZZ" + (source.maxRows() + 2))) + "?valueRenderOption=FORMATTED_VALUE"))
                .retrieve().body(Map.class));
        List<List<String>> all = new ArrayList<>();
        if (answer != null && answer.get("values") instanceof List<?> lines) {
            for (Object line : lines) {
                List<String> cells = new ArrayList<>();
                if (line instanceof List<?> values) values.forEach(v -> cells.add(v == null ? "" : String.valueOf(v)));
                all.add(cells);
            }
        }
        List<String> header = all.isEmpty() ? List.of() : all.getFirst().stream().map(String::trim).toList();
        // Trailing empty header cells aren't columns
        int width = header.size();
        while (width > 0 && header.get(width - 1).isEmpty()) width--;
        header = header.subList(0, width);
        List<List<String>> rows = all.size() > 1 ? all.subList(1, all.size()) : List.of();
        return new Sheet(spreadsheetId, info.sheetId(), info.title(), header, rows);
    }

    private List<SheetInfo> sheets(ConnectionRef connection, String spreadsheetId) {
        Map<?, ?> answer = call(connection, "open the spreadsheet", c -> c.get()
                .uri(URI.create(api + "/v4/spreadsheets/" + spreadsheetId + "?fields=sheets.properties(sheetId,title)"))
                .retrieve().body(Map.class));
        List<SheetInfo> sheets = new ArrayList<>();
        if (answer != null && answer.get("sheets") instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> sheet && sheet.get("properties") instanceof Map<?, ?> properties) {
                    Object id = properties.get("sheetId");
                    sheets.add(new SheetInfo(id instanceof Number n ? n.longValue() : 0, String.valueOf(properties.get("title"))));
                }
            }
        }
        return sheets;
    }

    private void fillMissingIds(SourceRef source, Sheet sheet, int keyIndex) {
        List<Map<String, Object>> data = new ArrayList<>();
        for (int i = 0; i < sheet.rows().size(); i++) {
            List<String> row = sheet.rows().get(i);
            if (row.stream().allMatch(String::isEmpty) || !cell(row, keyIndex).isEmpty()) continue;
            String cellRef = column(keyIndex + 1) + (i + 2);
            data.add(Map.of("range", range(sheet.title(), cellRef), "values", List.of(List.of(newId()))));
        }
        if (data.isEmpty()) return;
        call(source.connection(), "give rows ids", c -> c.post()
                .uri(URI.create(api + "/v4/spreadsheets/" + sheet.spreadsheetId() + "/values:batchUpdate"))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("valueInputOption", "RAW", "data", data))
                .retrieve().toBodilessEntity());
    }

    private void put(SourceRef source, String title, String cells, List<List<String>> values) {
        String spreadsheetId = spreadsheetId(source.settings());
        call(source.connection(), "write the row", c -> c.put()
                .uri(URI.create(valuesUri(spreadsheetId, range(title, cells)) + "?valueInputOption=USER_ENTERED"))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("values", values.stream().map(row -> row.stream().map(GoogleSheetsConnector::asTyped).toList()).toList()))
                .retrieve().toBodilessEntity());
    }

    private static Optional<Integer> rowNumber(Sheet sheet, int keyIndex, String rowId) {
        if (rowId.startsWith("#")) {
            try {
                int number = Integer.parseInt(rowId.substring(1));
                return number >= 2 && number - 2 < sheet.rows().size() ? Optional.of(number) : Optional.empty();
            } catch (NumberFormatException e) {
                return Optional.empty();
            }
        }
        if (keyIndex < 0) return Optional.empty();
        for (int i = 0; i < sheet.rows().size(); i++) {
            if (cell(sheet.rows().get(i), keyIndex).equals(rowId)) return Optional.of(i + 2);
        }
        return Optional.empty();
    }

    private static LiveRow liveRow(Sheet sheet, List<String> raw, int keyIndex, int rowNumber) {
        List<String> values = new ArrayList<>();
        for (int c = 0; c < sheet.header().size(); c++) values.add(cell(raw, c));
        String key = keyIndex >= 0 ? cell(raw, keyIndex) : "";
        return new LiveRow(key.isEmpty() ? "#" + rowNumber : key, values);
    }

    private static String cell(List<String> row, int index) {
        return index >= 0 && index < row.size() ? row.get(index) : "";
    }

    private static String key(SourceRef source) {
        return source.keyColumn() != null ? source.keyColumn() : ID_COLUMN;
    }

    /** Text as Sheets should take it when "typed": formulas are kept as text (a leading apostrophe). */
    static String asTyped(String value) {
        if (value == null) return "";
        if (!value.isEmpty() && "=+-@".indexOf(value.charAt(0)) >= 0 && !NUMBER.matcher(value).matches()) return "'" + value;
        return value;
    }

    static String spreadsheetId(Settings settings) {
        String value = settings.require("spreadsheet", "The spreadsheet");
        Matcher url = SPREADSHEET_URL.matcher(value);
        if (url.find()) return url.group(1);
        if (SPREADSHEET_ID.matcher(value).matches()) return value;
        throw new IllegalArgumentException("Not a Google Sheets link or spreadsheet id: " + value);
    }

    /** A1 notation for a sheet: 'Title'!cells. */
    static String range(String title, String cells) {
        return "'" + title.replace("'", "''") + "'!" + cells;
    }

    /** The column letters for a 1-based column number (1 → A, 27 → AA). */
    static String column(int number) {
        StringBuilder letters = new StringBuilder();
        for (int n = number; n > 0; n = (n - 1) / 26) letters.insert(0, (char) ('A' + (n - 1) % 26));
        return letters.toString();
    }

    private String valuesUri(String spreadsheetId, String range) {
        return api + "/v4/spreadsheets/" + spreadsheetId + "/values/" + UriUtils.encodePathSegment(range, StandardCharsets.UTF_8);
    }

    private static String newId() {
        return UUID.randomUUID().toString().substring(0, 13).replace("-", "");
    }

    private <T> T call(ConnectionRef connection, String what, java.util.function.Function<RestClient, T> request) {
        String token = tokens.accessToken(connection);
        RestClient authorized = client.mutate().defaultHeader("Authorization", "Bearer " + token).build();
        try {
            return request.apply(authorized);
        } catch (RestClientResponseException e) {
            HttpStatusCode status = e.getStatusCode();
            if (status.value() == 401) tokens.forget(connection.id());
            String reason = switch (status.value()) {
                case 401 -> "the sign-in expired; connect it again";
                case 403 -> "this Google account may not open the spreadsheet";
                case 404 -> "the spreadsheet wasn't found";
                case 429 -> "Google is limiting requests; try again in a minute";
                default -> "Google answered " + status.value();
            };
            throw new ConnectorException("Google Sheets could not " + what + ": " + reason, e);
        }
    }
}
