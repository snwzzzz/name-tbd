package com.example.ntbd.livedata.connector;

import com.example.ntbd.Exception.ConnectorException;
import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.livedata.PublicAddressGuard;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * PostgreSQL and MySQL tables, through JDBC.
 * <p>
 * Connection settings: {@code host}, {@code port}, {@code database}, {@code user}, {@code ssl} (default
 * true), PostgreSQL also {@code schema} (default "public"); secret: {@code password}. Source settings:
 * {@code table}. The key column is the source's, or else the table's (single-column) primary key.
 * <p>
 * Safety: only tables and columns the database describes are named in SQL (quoted), every value is a
 * parameter, and there is no way to send SQL of one's own. Hosts must be public ({@link PublicAddressGuard}),
 * MySQL's local-file and deserialization features are off. Each saved connection gets a small pool that
 * closes when unused; recommend customers connect with a user that can only use the tables apps need.
 */
@Component
public class JdbcConnector implements DataConnector {

    private static final Pattern HOST = Pattern.compile("[A-Za-z0-9.-]+|\\[[0-9A-Fa-f:.]+]");
    private static final Pattern DATABASE = Pattern.compile("[A-Za-z0-9_$.-]+");
    private static final int QUERY_TIMEOUT_SECONDS = 30;

    private final PublicAddressGuard guard;
    private final Cache<String, HikariDataSource> pools = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(10))
            .maximumSize(200)
            .removalListener((String key, HikariDataSource pool, com.github.benmanes.caffeine.cache.RemovalCause cause) -> {
                if (pool != null) pool.close();
            })
            .build();

    public JdbcConnector(PublicAddressGuard guard) {
        this.guard = guard;
    }

    @Override
    public Set<String> kinds() {
        return Set.of("postgres", "mysql");
    }

    @Override
    public void test(ConnectionRef connection) {
        try (Connection c = connect(connection)) {
            c.getMetaData().getDatabaseProductName();
        } catch (SQLException e) {
            throw failed("connect", e);
        }
    }

    @Override
    public List<String> targets(ConnectionRef connection, Settings partial) {
        Dialect dialect = Dialect.of(connection);
        try (Connection c = connect(connection);
             ResultSet tables = c.getMetaData().getTables(dialect.catalog(connection), dialect.schema(connection), "%",
                     new String[]{"TABLE", "VIEW"})) {
            List<String> names = new ArrayList<>();
            while (tables.next()) names.add(tables.getString("TABLE_NAME"));
            return names;
        } catch (SQLException e) {
            throw failed("list the tables", e);
        }
    }

    @Override
    public SourceSchema describe(SourceRef source) {
        try (Connection c = connect(source.connection())) {
            return describe(c, source);
        } catch (SQLException e) {
            throw failed("read the table's columns", e);
        }
    }

    @Override
    public LiveRows read(SourceRef source) {
        try (Connection c = connect(source.connection())) {
            Table table = table(c, source);
            String sql = "select " + table.columnList() + " from " + table.qualified() + " order by "
                    + table.dialect().quote(table.key()) + " " + table.dialect().limit(source.maxRows() + 1);
            try (PreparedStatement statement = c.prepareStatement(sql)) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                try (ResultSet rs = statement.executeQuery()) {
                    List<LiveRow> rows = new ArrayList<>();
                    while (rs.next()) rows.add(row(rs, table));
                    boolean truncated = rows.size() > source.maxRows();
                    return new LiveRows(table.names(), truncated ? rows.subList(0, source.maxRows()) : rows, truncated);
                }
            }
        } catch (SQLException e) {
            throw failed("read the rows", e);
        }
    }

    @Override
    public Optional<LiveRow> get(SourceRef source, String rowId) {
        try (Connection c = connect(source.connection())) {
            return get(c, table(c, source), rowId);
        } catch (SQLException e) {
            throw failed("read the row", e);
        }
    }

    @Override
    public LiveRow insert(SourceRef source, Map<String, String> values) {
        try (Connection c = connect(source.connection())) {
            Table table = table(c, source);
            List<String> columns = new ArrayList<>(values.keySet());
            String sql = columns.isEmpty()
                    ? "insert into " + table.qualified() + " " + table.dialect().defaultValues()
                    : "insert into " + table.qualified() + " (" + String.join(", ", columns.stream().map(table.dialect()::quote).toList())
                      + ") values (" + String.join(", ", columns.stream().map(col -> "?").toList()) + ")";
            String key;
            try (PreparedStatement statement = c.prepareStatement(sql, new String[]{table.key()})) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                for (int i = 0; i < columns.size(); i++) bind(statement, i + 1, table.type(columns.get(i)), values.get(columns.get(i)));
                statement.executeUpdate();
                key = values.get(table.key());
                if (key == null || key.isEmpty()) {
                    try (ResultSet generated = statement.getGeneratedKeys()) {
                        if (!generated.next()) throw new ConnectorException("The database didn't return the new row's " + table.key());
                        key = generated.getString(1);
                    }
                }
            }
            String id = key;
            return get(c, table, id).orElseThrow(() -> new ConnectorException("The new row can't be read back"));
        } catch (SQLException e) {
            throw failed("add the row", e);
        }
    }

    @Override
    public LiveRow update(SourceRef source, String rowId, Map<String, String> values) {
        try (Connection c = connect(source.connection())) {
            Table table = table(c, source);
            List<String> columns = new ArrayList<>(values.keySet());
            if (!columns.isEmpty()) {
                String sql = "update " + table.qualified() + " set "
                        + String.join(", ", columns.stream().map(col -> table.dialect().quote(col) + " = ?").toList())
                        + " where " + table.dialect().quote(table.key()) + " = ?";
                try (PreparedStatement statement = c.prepareStatement(sql)) {
                    statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                    for (int i = 0; i < columns.size(); i++) bind(statement, i + 1, table.type(columns.get(i)), values.get(columns.get(i)));
                    bind(statement, columns.size() + 1, table.type(table.key()), rowId);
                    if (statement.executeUpdate() == 0) throw new RowNotFoundException(rowId);
                }
            }
            String id = values.getOrDefault(table.key(), rowId);
            return get(c, table, id).orElseThrow(() -> new RowNotFoundException(rowId));
        } catch (SQLException e) {
            throw failed("change the row", e);
        }
    }

    @Override
    public void delete(SourceRef source, List<String> rowIds) {
        try (Connection c = connect(source.connection())) {
            Table table = table(c, source);
            String sql = "delete from " + table.qualified() + " where " + table.dialect().quote(table.key()) + " in ("
                    + String.join(", ", rowIds.stream().map(id -> "?").toList()) + ")";
            try (PreparedStatement statement = c.prepareStatement(sql)) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                for (int i = 0; i < rowIds.size(); i++) bind(statement, i + 1, table.type(table.key()), rowIds.get(i));
                statement.executeUpdate();
            }
        } catch (SQLException e) {
            throw failed("delete the rows", e);
        }
    }

    @PreDestroy
    void closePools() {
        pools.invalidateAll();
        pools.cleanUp();
    }

    // ---- Tables ----

    private enum Dialect {
        POSTGRES, MYSQL;

        static Dialect of(ConnectionRef connection) {
            return switch (connection.kind()) {
                case "postgres" -> POSTGRES;
                case "mysql" -> MYSQL;
                default -> throw new IllegalArgumentException("Not a database connection: " + connection.kind());
            };
        }

        String quote(String identifier) {
            return this == MYSQL ? "`" + identifier.replace("`", "``") + "`" : "\"" + identifier.replace("\"", "\"\"") + "\"";
        }

        String limit(int rows) {
            return "limit " + rows;
        }

        String defaultValues() {
            return this == MYSQL ? "() values ()" : "default values";
        }

        /** Where tables are looked up: PostgreSQL by schema, MySQL by database (its catalog). */
        String catalog(ConnectionRef connection) {
            return this == MYSQL ? connection.settings().text("database") : null;
        }

        String schema(ConnectionRef connection) {
            return this == POSTGRES ? connection.settings().text("schema", "public") : null;
        }
    }

    /** A table as the database describes it: its columns (in order) with their SQL types, and its key. */
    private record Table(Dialect dialect, String schema, String name, List<String> names, Map<String, Integer> types, String key) {
        String qualified() {
            return (schema != null ? dialect.quote(schema) + "." : "") + dialect.quote(name);
        }

        String columnList() {
            return String.join(", ", names.stream().map(dialect::quote).toList());
        }

        int type(String column) {
            return types.getOrDefault(column, Types.VARCHAR);
        }
    }

    private Table table(Connection c, SourceRef source) throws SQLException {
        Dialect dialect = Dialect.of(source.connection());
        String name = source.settings().require("table", "The table");
        String catalog = dialect.catalog(source.connection());
        String schema = dialect.schema(source.connection());
        DatabaseMetaData meta = c.getMetaData();

        List<String> names = new ArrayList<>();
        Map<String, Integer> types = new LinkedHashMap<>();
        try (ResultSet columns = meta.getColumns(catalog, schema, escapeLike(meta, name), "%")) {
            while (columns.next()) {
                if (!name.equals(columns.getString("TABLE_NAME"))) continue;
                String column = columns.getString("COLUMN_NAME");
                names.add(column);
                types.put(column, columns.getInt("DATA_TYPE"));
            }
        }
        if (names.isEmpty()) throw new ConnectorException("There is no table \"" + name + "\" (or this user can't read it)");

        String key = source.keyColumn();
        if (key == null) {
            List<String> primary = new ArrayList<>();
            try (ResultSet keys = meta.getPrimaryKeys(catalog, schema, name)) {
                while (keys.next()) primary.add(keys.getString("COLUMN_NAME"));
            }
            if (primary.size() != 1) {
                throw new IllegalArgumentException("The table \"" + name + "\" has no single-column primary key; choose a key column");
            }
            key = primary.getFirst();
        }
        if (!names.contains(key)) throw new IllegalArgumentException("The table \"" + name + "\" has no column \"" + key + "\"");
        return new Table(dialect, schema, name, names, types, key);
    }

    private SourceSchema describe(Connection c, SourceRef source) throws SQLException {
        Table table = table(c, source);
        List<ColumnInfo> columns = table.names().stream().map(n -> new ColumnInfo(n, typeName(table.type(n)))).toList();
        return new SourceSchema(columns, table.key());
    }

    private Optional<LiveRow> get(Connection c, Table table, String rowId) throws SQLException {
        String sql = "select " + table.columnList() + " from " + table.qualified() + " where " + table.dialect().quote(table.key()) + " = ?";
        try (PreparedStatement statement = c.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            bind(statement, 1, table.type(table.key()), rowId);
            try (ResultSet rs = statement.executeQuery()) {
                return rs.next() ? Optional.of(row(rs, table)) : Optional.empty();
            }
        }
    }

    private static LiveRow row(ResultSet rs, Table table) throws SQLException {
        List<String> values = new ArrayList<>(table.names().size());
        String id = null;
        for (int i = 0; i < table.names().size(); i++) {
            String value = text(rs, i + 1, table.type(table.names().get(i)));
            values.add(value);
            if (table.names().get(i).equals(table.key())) id = value;
        }
        return new LiveRow(id, values);
    }

    /** A cell as text: booleans as true/false, everything else as the driver writes it; NULL as "". */
    private static String text(ResultSet rs, int index, int type) throws SQLException {
        if (type == Types.BOOLEAN || type == Types.BIT) {
            boolean value = rs.getBoolean(index);
            return rs.wasNull() ? "" : String.valueOf(value);
        }
        if (type == Types.TIMESTAMP || type == Types.TIMESTAMP_WITH_TIMEZONE) {
            Object value = rs.getObject(index);
            return value == null ? "" : value.toString().replace(' ', 'T');
        }
        String value = rs.getString(index);
        return value == null ? "" : value;
    }

    /** Binds text as the column's type: "" is NULL except in text columns; booleans as booleans. */
    private static void bind(PreparedStatement statement, int index, int type, String value) throws SQLException {
        boolean textual = type == Types.VARCHAR || type == Types.CHAR || type == Types.LONGVARCHAR || type == Types.NVARCHAR
                || type == Types.NCHAR || type == Types.LONGNVARCHAR || type == Types.CLOB;
        if (value == null || (value.isEmpty() && !textual)) {
            statement.setNull(index, type);
        } else if (type == Types.BOOLEAN || type == Types.BIT) {
            statement.setBoolean(index, value.equalsIgnoreCase("true") || value.equals("1") || value.equalsIgnoreCase("yes"));
        } else {
            // PostgreSQL connections send text as "unspecified" (stringtype), so the server converts it
            statement.setString(index, value);
        }
    }

    private static String typeName(int type) {
        return switch (type) {
            case Types.BOOLEAN, Types.BIT -> "boolean";
            case Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT, Types.DECIMAL, Types.NUMERIC, Types.REAL,
                 Types.FLOAT, Types.DOUBLE -> "number";
            case Types.DATE, Types.TIMESTAMP, Types.TIMESTAMP_WITH_TIMEZONE -> "date";
            default -> "text";
        };
    }

    private static String escapeLike(DatabaseMetaData meta, String name) throws SQLException {
        String escape = meta.getSearchStringEscape();
        return escape == null ? name : name.replace(escape, escape + escape).replace("_", escape + "_").replace("%", escape + "%");
    }

    // ---- Connecting ----

    private Connection connect(ConnectionRef connection) throws SQLException {
        Settings settings = connection.settings();
        String host = settings.require("host", "The host");
        if (!HOST.matcher(host).matches()) throw new IllegalArgumentException("Not a valid host name: " + host);
        String database = settings.require("database", "The database");
        if (!DATABASE.matcher(database).matches()) throw new IllegalArgumentException("Not a valid database name: " + database);
        guard.requirePublicHost(host.startsWith("[") ? host.substring(1, host.length() - 1) : host);

        String url = url(connection, host, database);
        Properties properties = new Properties();
        properties.setProperty("user", settings.require("user", "The user"));
        String password = connection.secret().text("password");
        if (password != null) properties.setProperty("password", password);

        if (connection.id() == null) {
            // Trying a connection out: no pool for something that may never be saved
            DriverManager.setLoginTimeout(10);
            return DriverManager.getConnection(url, properties);
        }
        String poolKey = connection.id() + "|" + url + "|" + properties.getProperty("user") + "|" + Integer.toHexString(String.valueOf(password).hashCode());
        HikariDataSource pool = pools.get(poolKey, k -> pool(url, properties));
        try {
            return pool.getConnection();
        } catch (SQLException e) {
            pools.invalidate(poolKey);
            throw e;
        }
    }

    private static HikariDataSource pool(String url, Properties properties) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setDataSourceProperties(properties);
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(0);
        config.setIdleTimeout(Duration.ofMinutes(1).toMillis());
        config.setConnectionTimeout(Duration.ofSeconds(10).toMillis());
        config.setInitializationFailTimeout(-1);
        config.setPoolName("live-data");
        return new HikariDataSource(config);
    }

    private static String url(ConnectionRef connection, String host, String database) {
        Settings settings = connection.settings();
        boolean ssl = settings.bool("ssl", true);
        return switch (Dialect.of(connection)) {
            case POSTGRES -> "jdbc:postgresql://" + host + ":" + settings.integer("port", 5432) + "/" + database
                    + "?sslmode=" + (ssl ? "require" : "disable")
                    + "&stringtype=unspecified&connectTimeout=10&socketTimeout=60&ApplicationName=ntbd-live-data";
            case MYSQL -> "jdbc:mysql://" + host + ":" + settings.integer("port", 3306) + "/" + database
                    + "?sslMode=" + (ssl ? "REQUIRED" : "DISABLED")
                    + "&connectTimeout=10000&socketTimeout=60000&allowLoadLocalInfile=false&allowUrlInLocalInfile=false"
                    + "&autoDeserialize=false&allowMultiQueries=false";
        };
    }

    private static ConnectorException failed(String what, SQLException e) {
        String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        return new ConnectorException("The database could not " + what + ": " + message, e);
    }
}
