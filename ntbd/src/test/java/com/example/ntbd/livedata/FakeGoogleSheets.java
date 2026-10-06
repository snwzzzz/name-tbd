package com.example.ntbd.livedata;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A spreadsheet with one sheet, served like the Google Sheets API v4 (the calls GoogleSheetsConnector makes):
 * sheet properties, reading values, appending, writing ranges, batch value updates and deleting rows.
 * Values written "as typed" lose a leading apostrophe, as in Google Sheets.
 */
public class FakeGoogleSheets implements AutoCloseable {

    public static final String SPREADSHEET = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
    public static final String TOKEN = "fake-google-access-token";

    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final Pattern CELL = Pattern.compile("([A-Z]+)(\\d+)");

    private final HttpServer server;
    private final String title;
    /** Row 1 first; each row's cells (no trailing padding). */
    final List<List<String>> grid = new CopyOnWriteArrayList<>();
    final List<String> requests = new CopyOnWriteArrayList<>();
    /** Every cell value as the requests sent it (before Sheets interprets it). */
    static final List<String> SENT = new CopyOnWriteArrayList<>();

    public FakeGoogleSheets(String title, List<List<String>> rows) throws IOException {
        this.title = title;
        rows.forEach(row -> grid.add(new ArrayList<>(row)));
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
    }

    public String url() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    public synchronized void reset(List<List<String>> rows) {
        grid.clear();
        rows.forEach(row -> grid.add(new ArrayList<>(row)));
        requests.clear();
    }

    public synchronized List<List<String>> rows() {
        return grid.stream().map(List::copyOf).toList();
    }

    @Override
    public void close() {
        server.stop(0);
    }

    @SuppressWarnings("unchecked")
    private synchronized void handle(HttpExchange exchange) throws IOException {
        String path = URLDecoder.decode(exchange.getRequestURI().getRawPath(), StandardCharsets.UTF_8);
        String method = exchange.getRequestMethod();
        requests.add(method + " " + path);
        if (!("Bearer " + TOKEN).equals(exchange.getRequestHeaders().getFirst("Authorization"))) {
            send(exchange, 401, Map.of("error", "unauthenticated"));
            return;
        }
        String prefix = "/v4/spreadsheets/" + SPREADSHEET;
        if (!path.startsWith(prefix)) {
            send(exchange, 404, Map.of("error", "not found"));
            return;
        }
        String rest = path.substring(prefix.length());
        Map<String, Object> body = exchange.getRequestBody().available() > 0 || "POST".equals(method) || "PUT".equals(method)
                ? readBody(exchange) : Map.of();

        if (method.equals("GET") && rest.isEmpty()) {
            send(exchange, 200, Map.of("sheets", List.of(Map.of("properties", Map.of("sheetId", 7, "title", title)))));
        } else if (method.equals("GET") && rest.startsWith("/values/")) {
            send(exchange, 200, Map.of("values", rows()));
        } else if (method.equals("POST") && rest.startsWith("/values/") && rest.endsWith(":append")) {
            for (List<Object> row : (List<List<Object>>) body.get("values")) grid.add(typed(row));
            send(exchange, 200, Map.of());
        } else if (method.equals("PUT") && rest.startsWith("/values/")) {
            write(rest.substring("/values/".length()), (List<List<Object>>) body.get("values"));
            send(exchange, 200, Map.of());
        } else if (method.equals("POST") && rest.equals("/values:batchUpdate")) {
            for (Map<String, Object> data : (List<Map<String, Object>>) body.get("data")) {
                write(String.valueOf(data.get("range")), (List<List<Object>>) data.get("values"));
            }
            send(exchange, 200, Map.of());
        } else if (method.equals("POST") && rest.equals(":batchUpdate")) {
            List<Integer> starts = new ArrayList<>();
            for (Map<String, Object> request : (List<Map<String, Object>>) body.get("requests")) {
                Map<String, Object> range = (Map<String, Object>) ((Map<String, Object>) request.get("deleteDimension")).get("range");
                starts.add(((Number) range.get("startIndex")).intValue());
            }
            starts.stream().sorted(Comparator.reverseOrder()).forEach(i -> grid.remove((int) i));
            send(exchange, 200, Map.of());
        } else {
            send(exchange, 400, Map.of("error", "unexpected " + method + " " + rest));
        }
    }

    /** Writes values from a range's first cell ('Title'!B3 or 'Title'!A1:C1). */
    private void write(String range, List<List<Object>> values) {
        String cells = range.substring(range.lastIndexOf('!') + 1).split(":")[0];
        Matcher m = CELL.matcher(cells);
        if (!m.matches()) throw new IllegalArgumentException("bad range " + range);
        int column = 0;
        for (char c : m.group(1).toCharArray()) column = column * 26 + (c - 'A' + 1);
        int rowIndex = Integer.parseInt(m.group(2)) - 1;
        for (int r = 0; r < values.size(); r++) {
            while (grid.size() <= rowIndex + r) grid.add(new ArrayList<>());
            List<String> row = grid.get(rowIndex + r);
            List<String> typed = typed(values.get(r));
            for (int c = 0; c < typed.size(); c++) {
                while (row.size() <= column - 1 + c) row.add("");
                row.set(column - 1 + c, typed.get(c));
            }
        }
    }

    private static List<String> typed(List<Object> row) {
        List<String> cells = new ArrayList<>();
        for (Object value : row) {
            String text = value == null ? "" : String.valueOf(value);
            SENT.add(text);
            cells.add(text.startsWith("'") ? text.substring(1) : text);
        }
        return cells;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> readBody(HttpExchange exchange) throws IOException {
        byte[] bytes = exchange.getRequestBody().readAllBytes();
        return bytes.length == 0 ? Map.of() : JSON.readValue(bytes, Map.class);
    }

    private static void send(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
