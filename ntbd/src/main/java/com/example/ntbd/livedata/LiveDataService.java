package com.example.ntbd.livedata;

import com.example.ntbd.Exception.ConnectorException;
import com.example.ntbd.Exception.DataSourceNotFoundException;
import com.example.ntbd.Exception.ForbiddenException;
import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.domain.DataConnection;
import com.example.ntbd.domain.DataSource;
import com.example.ntbd.domain.DataSourceColumn;
import com.example.ntbd.livedata.connector.ConnectionRef;
import com.example.ntbd.livedata.connector.ConnectorRegistry;
import com.example.ntbd.livedata.connector.DataConnector;
import com.example.ntbd.livedata.connector.LiveRow;
import com.example.ntbd.livedata.connector.LiveRows;
import com.example.ntbd.livedata.connector.Settings;
import com.example.ntbd.livedata.connector.SourceRef;
import com.example.ntbd.livedata.connector.SourceSchema;
import com.example.ntbd.persistence.DataSourceRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Reads and changes the rows of any data source, embedded ({@link EmbeddedRows}) or live (its
 * {@link DataConnector}). The data API (exported apps), the editor and flows on the server all change
 * rows here, so the rules are the same for all of them:
 * <ul>
 *   <li>rows are found by id (key column), never by position;</li>
 *   <li>values are text by column name; a column the source doesn't have is an error;</li>
 *   <li>a read-only source can't be changed;</li>
 *   <li>a live source answers at most {@code app.data.max-rows} rows (and says when there were more);</li>
 *   <li>an update may carry the values it was based on: if the row changed meanwhile, the update still
 *       wins (last write wins) and the answer lists the conflict, so the app can tell its user.</li>
 * </ul>
 * Calls to a customer's system run outside database transactions, so a slow system doesn't hold one.
 */
@Service
public class LiveDataService {

    private final DataSourceRepository dataSources;
    private final ConnectorRegistry connectors;
    private final EmbeddedRows embedded;
    private final SecretBox secrets;
    private final ObjectMapper objectMapper;
    private final LiveDataProperties properties;
    private final TransactionTemplate transactions;
    private final Cache<Long, LiveRows> readCache;

    public LiveDataService(DataSourceRepository dataSources, ConnectorRegistry connectors, EmbeddedRows embedded,
                           SecretBox secrets, ObjectMapper objectMapper, LiveDataProperties properties,
                           PlatformTransactionManager transactionManager) {
        this.dataSources = dataSources;
        this.connectors = connectors;
        this.embedded = embedded;
        this.secrets = secrets;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.transactions = new TransactionTemplate(transactionManager);
        this.transactions.setReadOnly(true);
        this.readCache = Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(Math.max(0, properties.readCacheSeconds())))
                .maximumSize(1_000)
                .build();
    }

    /** A data source as the data API serves it (without its rows). */
    public record SourceView(Long id, Long applicationId, String name, String kind, boolean readOnly, String keyColumn,
                             List<String> columns, SourceRef ref) {
        public boolean embedded() {
            return DataSource.EMBEDDED.equals(kind);
        }
    }

    /** A change's answer: the row as it is now, and the values someone else had changed meanwhile (empty: none). */
    public record UpdateResult(LiveRow row, Map<String, String> conflicts) {
    }

    public SourceView view(Long sourceId) {
        return Objects.requireNonNull(transactions.execute(status -> {
            DataSource source = dataSources.findById(new DataSource.DataSourceId(sourceId))
                    .orElseThrow(() -> new DataSourceNotFoundException(sourceId));
            List<String> columns = source.getColumns().stream()
                    .sorted(Comparator.comparingInt(DataSourceColumn::getColumnIndex))
                    .map(DataSourceColumn::getName)
                    .toList();
            SourceRef ref = source.isEmbedded() ? null : new SourceRef(source.getId().id(), connectionRef(source.getConnection()),
                    parse(source.getSettings()), source.getKeyColumn(), columns, properties.maxRows());
            return new SourceView(source.getId().id(), source.getBranch().getApplication().getId().id(), source.getName(),
                    source.getKind(), source.isReadOnly(), source.getKeyColumn(), columns, ref);
        }));
    }

    public LiveRows read(Long sourceId) {
        SourceView source = view(sourceId);
        if (source.embedded()) return embedded.read(sourceId);
        LiveRows cached = readCache.getIfPresent(sourceId);
        if (cached != null) return cached;
        LiveRows rows = connector(source).read(source.ref());
        readCache.put(sourceId, rows);
        return rows;
    }

    public Optional<LiveRow> get(Long sourceId, String rowId) {
        SourceView source = view(sourceId);
        return source.embedded() ? embedded.get(sourceId, rowId) : connector(source).get(source.ref(), rowId);
    }

    public LiveRow insert(Long sourceId, Map<String, String> values) {
        SourceView source = writable(sourceId);
        Map<String, String> checked = checkColumns(source, values);
        try {
            return source.embedded() ? embedded.insert(sourceId, checked) : connector(source).insert(source.ref(), checked);
        } finally {
            readCache.invalidate(sourceId);
        }
    }

    /**
     * Changes a row's given columns. {@code base}: the row's values the change was made on (may be null); a
     * column whose value differs now was changed by someone else meanwhile, and is reported as a conflict.
     */
    public UpdateResult update(Long sourceId, String rowId, Map<String, String> values, Map<String, String> base) {
        SourceView source = writable(sourceId);
        Map<String, String> checked = checkColumns(source, values);
        Map<String, String> conflicts = new LinkedHashMap<>();
        if (base != null && !base.isEmpty()) {
            LiveRow current = get(sourceId, rowId).orElseThrow(() -> new RowNotFoundException(rowId));
            List<String> columns = source.columns();
            base.forEach((column, was) -> {
                int index = columns.indexOf(column);
                if (index < 0 || index >= current.values().size()) return;
                String now = current.values().get(index);
                // Someone else changed it to something other than what this change sets
                if (!Objects.equals(blankToEmpty(now), blankToEmpty(was)) && !Objects.equals(blankToEmpty(now), blankToEmpty(checked.get(column)))) {
                    conflicts.put(column, now);
                }
            });
        }
        try {
            LiveRow row = source.embedded() ? embedded.update(sourceId, rowId, checked) : connector(source).update(source.ref(), rowId, checked);
            return new UpdateResult(row, conflicts);
        } finally {
            readCache.invalidate(sourceId);
        }
    }

    public void delete(Long sourceId, List<String> rowIds) {
        SourceView source = writable(sourceId);
        if (rowIds.isEmpty()) return;
        try {
            if (source.embedded()) embedded.delete(sourceId, rowIds);
            else connector(source).delete(source.ref(), rowIds);
        } finally {
            readCache.invalidate(sourceId);
        }
    }

    /** Asks the source's system for its columns and key column now. */
    public SourceSchema describe(Long sourceId) {
        SourceView source = view(sourceId);
        if (source.embedded()) throw new IllegalArgumentException("An embedded data source has no connection to describe");
        return connector(source).describe(source.ref());
    }

    /** The connection as connectors get it, its secret decrypted. */
    public ConnectionRef connectionRef(DataConnection connection) {
        if (connection == null) {
            throw new ConnectorException("This data source's connection was deleted; choose another one");
        }
        Settings secret = connection.getSecret() == null ? Settings.EMPTY : parse(secrets.open(connection.getSecret()));
        return new ConnectionRef(connection.getId(), connection.getKind(), parse(connection.getSettings()), secret);
    }

    public DataConnector connector(String kind) {
        return connectors.get(kind);
    }

    /** Forgets cached rows (e.g. after a source's settings changed). */
    public void forget(Long sourceId) {
        readCache.invalidate(sourceId);
    }

    public int maxRows() {
        return properties.maxRows();
    }

    @SuppressWarnings("unchecked")
    public Settings parse(String json) {
        if (json == null || json.isBlank()) return Settings.EMPTY;
        return new Settings(objectMapper.readValue(json, Map.class));
    }

    public String json(Settings settings) {
        return objectMapper.writeValueAsString(settings.values());
    }

    private DataConnector connector(SourceView source) {
        return connectors.get(source.ref().connection().kind());
    }

    private SourceView writable(Long sourceId) {
        SourceView source = view(sourceId);
        if (source.readOnly()) throw new ForbiddenException("The data source \"" + source.name() + "\" is read-only");
        return source;
    }

    private static Map<String, String> checkColumns(SourceView source, Map<String, String> values) {
        Map<String, String> checked = new LinkedHashMap<>();
        (values == null ? Map.<String, String>of() : values).forEach((column, value) -> {
            if (!source.columns().contains(column)) {
                throw new IllegalArgumentException("The data source \"" + source.name() + "\" has no column \"" + column + "\"");
            }
            checked.put(column, value == null ? "" : value);
        });
        return checked;
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value;
    }

    /** Rows as lists of values, e.g. for flows on the server. */
    public static List<List<String>> values(LiveRows rows) {
        List<List<String>> result = new ArrayList<>();
        rows.rows().forEach(row -> result.add(row.values()));
        return result;
    }
}
