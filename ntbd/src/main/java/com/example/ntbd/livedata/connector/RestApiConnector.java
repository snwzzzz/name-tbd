package com.example.ntbd.livedata.connector;

import com.example.ntbd.Exception.ConnectorException;
import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.livedata.PublicAddressGuard;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Any JSON API whose records are rows (a "REST" connection).
 * <p>
 * Connection settings: {@code baseUrl} (https), {@code headers} (extra headers, not secret),
 * {@code authHeader} (default "Authorization"); secret: {@code authValue}, e.g. "Bearer abc" (sent as the
 * auth header, never shown again).
 * <p>
 * Source settings:
 * <ul>
 *   <li>{@code path}: the records' path, e.g. "/orders"; a record is {@code path/<id>} ({@code itemPath} to
 *       change it, with {id} for the record's id);</li>
 *   <li>{@code recordsPath}: where the list is in the answer, dotted ("data.items"); empty: the answer is the list;</li>
 *   <li>{@code pagination}: none (default), page ({@code pageParam}, {@code sizeParam}, {@code pageSize},
 *       {@code firstPage}), offset ({@code offsetParam}, {@code limitParam}, {@code pageSize}), cursor
 *       ({@code cursorParam}, {@code nextCursorPath}) or link (the Link header's rel="next");</li>
 *   <li>{@code updateMethod}: PATCH (default) or PUT; {@code columns}: the columns (default: the fields of the
 *       first records).</li>
 * </ul>
 * The key column is the source's, default "id". Field values become text (objects and lists as JSON); when
 * written, text that the column's other values show to be a number or true/false is sent as one.
 * Every request goes to a public address ({@link PublicAddressGuard}) and redirects aren't followed.
 */
@Component
public class RestApiConnector implements DataConnector {

    private static final int MAX_PAGES = 100;
    private static final Pattern NEXT_LINK = Pattern.compile("<([^>]+)>\\s*;\\s*rel=\"?next\"?");
    private static final Pattern NUMBER = Pattern.compile("-?(0|[1-9]\\d*)(\\.\\d+)?([eE][-+]?\\d+)?");

    private final PublicAddressGuard guard;
    private final RestClient client;
    private final ObjectMapper objectMapper;

    public RestApiConnector(PublicAddressGuard guard, RestClient.Builder liveDataHttp, ObjectMapper objectMapper) {
        this.guard = guard;
        this.client = liveDataHttp.build();
        this.objectMapper = objectMapper;
    }

    @Override
    public Set<String> kinds() {
        return Set.of("rest");
    }

    @Override
    public void test(ConnectionRef connection) {
        guard.requirePublicUrl(baseUrl(connection));
    }

    @Override
    public SourceSchema describe(SourceRef source) {
        List<Map<String, Object>> records = records(source, 100).records();
        List<String> configured = source.settings().list("columns");
        Set<String> names = new LinkedHashSet<>(configured);
        if (names.isEmpty()) records.forEach(record -> names.addAll(record.keySet()));
        String key = key(source);
        if (!names.isEmpty() && !names.contains(key)) {
            throw new IllegalArgumentException("The API's records have no field \"" + key + "\"; choose the key column");
        }
        if (names.isEmpty()) names.add(key);
        List<ColumnInfo> columns = names.stream().map(name -> new ColumnInfo(name, typeOf(records, name))).toList();
        return new SourceSchema(columns, key);
    }

    @Override
    public LiveRows read(SourceRef source) {
        Page page = records(source, source.maxRows() + 1);
        List<String> columns = source.columns().isEmpty() ? describe(source).names() : source.columns();
        List<LiveRow> rows = page.records().stream().limit(source.maxRows()).map(r -> row(r, columns, key(source))).toList();
        return new LiveRows(columns, rows, page.records().size() > source.maxRows() || page.more());
    }

    @Override
    public Optional<LiveRow> get(SourceRef source, String rowId) {
        try {
            Object answer = send(source.connection(), HttpMethod.GET, itemUri(source, rowId), null).getBody();
            return record(answer).map(r -> row(r, source.columns(), key(source)));
        } catch (RowNotFoundException e) {
            return Optional.empty();
        }
    }

    @Override
    public LiveRow insert(SourceRef source, Map<String, String> values) {
        ResponseEntity<Object> answer = send(source.connection(), HttpMethod.POST, listUri(source, Map.of()), typed(source, values));
        Optional<Map<String, Object>> created = record(answer.getBody());
        if (created.isPresent() && created.get().get(key(source)) != null) {
            return row(created.get(), source.columns(), key(source));
        }
        // An API that only says where the new record is
        URI location = answer.getHeaders().getLocation();
        if (location != null) {
            String path = location.getPath();
            String id = UriUtils.decode(path.substring(path.lastIndexOf('/') + 1), StandardCharsets.UTF_8);
            return get(source, id).orElseThrow(() -> new ConnectorException("The API added the record but it can't be read back"));
        }
        throw new ConnectorException("The API didn't answer with the new record (or its id)");
    }

    @Override
    public LiveRow update(SourceRef source, String rowId, Map<String, String> values) {
        HttpMethod method = "PUT".equalsIgnoreCase(source.settings().text("updateMethod")) ? HttpMethod.PUT : HttpMethod.PATCH;
        Map<String, Object> body = typed(source, values);
        if (method == HttpMethod.PUT) {
            // PUT replaces the record: send it whole
            LiveRow current = get(source, rowId).orElseThrow(() -> new RowNotFoundException(rowId));
            Map<String, String> whole = new LinkedHashMap<>();
            for (int i = 0; i < source.columns().size(); i++) whole.put(source.columns().get(i), current.values().get(i));
            whole.putAll(values);
            body = typed(source, whole);
        }
        Object answer = send(source.connection(), method, itemUri(source, rowId), body).getBody();
        Optional<Map<String, Object>> changed = record(answer);
        if (changed.isPresent() && changed.get().get(key(source)) != null) return row(changed.get(), source.columns(), key(source));
        return get(source, values.getOrDefault(key(source), rowId)).orElseThrow(() -> new RowNotFoundException(rowId));
    }

    @Override
    public void delete(SourceRef source, List<String> rowIds) {
        for (String id : rowIds) {
            try {
                send(source.connection(), HttpMethod.DELETE, itemUri(source, id), null);
            } catch (RowNotFoundException ignored) {
                // Gone already
            }
        }
    }

    // ---- Requests ----

    private record Page(List<Map<String, Object>> records, boolean more) {
    }

    /** Up to {@code limit} records, page by page as the source's pagination says. */
    private Page records(SourceRef source, int limit) {
        Settings settings = source.settings();
        String pagination = settings.text("pagination", "none");
        int pageSize = settings.integer("pageSize", 100);
        List<Map<String, Object>> records = new ArrayList<>();
        Map<String, String> query = new LinkedHashMap<>();
        URI next = null;
        int page = settings.integer("firstPage", 1);
        for (int i = 0; i < MAX_PAGES; i++) {
            switch (pagination) {
                case "page" -> {
                    query.put(settings.text("pageParam", "page"), String.valueOf(page + i));
                    query.put(settings.text("sizeParam", "per_page"), String.valueOf(pageSize));
                }
                case "offset" -> {
                    query.put(settings.text("offsetParam", "offset"), String.valueOf(records.size()));
                    query.put(settings.text("limitParam", "limit"), String.valueOf(pageSize));
                }
                default -> { }
            }
            URI uri = next != null ? next : listUri(source, query);
            ResponseEntity<Object> answer = send(source.connection(), HttpMethod.GET, uri, null);
            List<Map<String, Object>> found = list(answer.getBody(), settings.text("recordsPath"));
            records.addAll(found);
            if (records.size() >= limit) return new Page(records.subList(0, limit), true);

            next = null;
            switch (pagination) {
                case "page", "offset" -> {
                    if (found.size() < pageSize) return new Page(records, false);
                }
                case "cursor" -> {
                    Object cursor = at(answer.getBody(), settings.text("nextCursorPath", "next_cursor"));
                    if (cursor == null || String.valueOf(cursor).isBlank()) return new Page(records, false);
                    query.put(settings.text("cursorParam", "cursor"), String.valueOf(cursor));
                }
                case "link" -> {
                    String link = answer.getHeaders().getFirst(HttpHeaders.LINK);
                    Matcher matcher = link == null ? null : NEXT_LINK.matcher(link);
                    if (matcher == null || !matcher.find()) return new Page(records, false);
                    next = URI.create(matcher.group(1));
                    // Only further pages of the same API
                    if (!next.getHost().equalsIgnoreCase(URI.create(baseUrl(source.connection())).getHost())) {
                        return new Page(records, false);
                    }
                }
                default -> {
                    return new Page(records, false);
                }
            }
        }
        return new Page(records, true);
    }

    private ResponseEntity<Object> send(ConnectionRef connection, HttpMethod method, URI uri, Object body) {
        guard.requirePublicUrl(uri.toString());
        Settings settings = connection.settings();
        RestClient.RequestBodySpec request = client.method(method).uri(uri).accept(MediaType.APPLICATION_JSON);
        settings.map("headers").forEach(request::header);
        String auth = connection.secret().text("authValue");
        if (auth != null) request.header(settings.text("authHeader", HttpHeaders.AUTHORIZATION), auth);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).body(body);
        try {
            return request.retrieve().toEntity(Object.class);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404 && method != HttpMethod.POST) throw new RowNotFoundException(uri.getPath());
            if (e.getStatusCode().is3xxRedirection()) {
                throw new ConnectorException("The API redirected the request; use the final URL as the base URL", e);
            }
            throw new ConnectorException("The API answered " + e.getStatusCode().value() + " to " + method.name() + " " + uri.getPath(), e);
        } catch (RuntimeException e) {
            if (e instanceof ConnectorException || e instanceof RowNotFoundException) throw e;
            throw new ConnectorException("The API can't be reached: " + e.getMessage(), e);
        }
    }

    private URI listUri(SourceRef source, Map<String, String> query) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(baseUrl(source.connection()) + path(source));
        query.forEach(uri::replaceQueryParam);
        return uri.encode().build().toUri();
    }

    private URI itemUri(SourceRef source, String id) {
        String template = source.settings().text("itemPath", path(source) + "/{id}");
        String path = template.replace("{id}", UriUtils.encodePathSegment(id, StandardCharsets.UTF_8));
        return URI.create(baseUrl(source.connection()) + (path.startsWith("/") ? path : "/" + path));
    }

    private static String path(SourceRef source) {
        String path = source.settings().require("path", "The path");
        return path.startsWith("/") ? path : "/" + path;
    }

    private static String baseUrl(ConnectionRef connection) {
        return connection.settings().require("baseUrl", "The base URL").replaceAll("/+$", "");
    }

    private static String key(SourceRef source) {
        return source.keyColumn() != null ? source.keyColumn() : "id";
    }

    // ---- Records ----

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(Object answer, String recordsPath) {
        Object list = recordsPath == null ? answer : at(answer, recordsPath);
        if (!(list instanceof List<?> items)) {
            throw new ConnectorException("The API's answer has no list of records"
                    + (recordsPath == null ? " (set where the records are)" : " at \"" + recordsPath + "\""));
        }
        List<Map<String, Object>> records = new ArrayList<>();
        for (Object item : items) if (item instanceof Map<?, ?> map) records.add((Map<String, Object>) map);
        return records;
    }

    @SuppressWarnings("unchecked")
    private static Optional<Map<String, Object>> record(Object answer) {
        return answer instanceof Map<?, ?> map ? Optional.of((Map<String, Object>) map) : Optional.empty();
    }

    /** The value at a dotted path ("data.items"). */
    private static Object at(Object value, String path) {
        Object current = value;
        for (String part : path.split("\\.")) {
            if (part.isEmpty()) continue;
            if (!(current instanceof Map<?, ?> map)) return null;
            current = map.get(part);
        }
        return current;
    }

    private LiveRow row(Map<String, Object> record, List<String> columns, String key) {
        List<String> values = columns.stream().map(c -> text(record.get(c))).toList();
        return new LiveRow(text(record.get(key)), values);
    }

    private String text(Object value) {
        if (value == null) return "";
        if (value instanceof Map<?, ?> || value instanceof List<?>) return objectMapper.writeValueAsString(value);
        return String.valueOf(value);
    }

    /** Values as JSON: numbers and booleans as such where the column holds those. */
    private Map<String, Object> typed(SourceRef source, Map<String, String> values) {
        Map<String, Object> body = new LinkedHashMap<>();
        values.forEach((column, value) -> {
            String type = source.settings().map("columnTypes").getOrDefault(column, "text");
            if (value.isEmpty() && !type.equals("text")) body.put(column, null);
            else if (type.equals("number") && NUMBER.matcher(value).matches()) body.put(column, new java.math.BigDecimal(value));
            else if (type.equals("boolean") && (value.equals("true") || value.equals("false"))) body.put(column, Boolean.parseBoolean(value));
            else body.put(column, value);
        });
        return body;
    }

    private static String typeOf(List<Map<String, Object>> records, String column) {
        String type = null;
        for (Map<String, Object> record : records) {
            Object value = record.get(column);
            if (value == null) continue;
            String kind = value instanceof Number ? "number" : value instanceof Boolean ? "boolean" : "text";
            if (type != null && !type.equals(kind)) return "text";
            type = kind;
        }
        return type == null ? "text" : type;
    }
}
