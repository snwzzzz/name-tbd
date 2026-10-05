package com.example.ntbd.livedata.connector;

import com.example.ntbd.Exception.ConnectorException;
import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.livedata.LiveDataProperties;
import com.example.ntbd.livedata.PublicAddressGuard;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayNameGeneration;
import org.junit.jupiter.api.DisplayNameGenerator;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** A customer's PostgreSQL table, read and written through the connector (a real database in a container). */
@Testcontainers(disabledWithoutDocker = true)
@DisplayNameGeneration(DisplayNameGenerator.ReplaceUnderscores.class)
class JdbcConnectorPostgresTest {

    private static PostgreSQLContainer<?> postgres;
    private static JdbcConnector connector;

    @BeforeAll
    static void start() {
        postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:17.6-alpine"))
                .withDatabaseName("shop").withUsername("app").withPassword("s3cret");
        postgres.start();
        connector = new JdbcConnector(new PublicAddressGuard(new LiveDataProperties(null, "k1", List.of(), 5000, true, 600, 3, null)));
    }

    @AfterAll
    static void stop() {
        connector.closePools();
        postgres.stop();
    }

    @BeforeEach
    void freshTable() throws Exception {
        try (Connection c = DriverManager.getConnection(postgres.getJdbcUrl(), "app", "s3cret"); Statement s = c.createStatement()) {
            s.execute("drop table if exists orders");
            s.execute("create table orders (id serial primary key, customer text not null, amount numeric(10,2), paid boolean, due date)");
            s.execute("insert into orders (customer, amount, paid, due) values ('Ada', 750.00, true, '2026-01-31'), ('Bob', 20.50, false, null)");
        }
    }

    private static ConnectionRef connection(Long id, String password) {
        return new ConnectionRef(id, "postgres", new Settings(Map.of(
                "host", postgres.getHost(), "port", postgres.getMappedPort(5432), "database", "shop", "user", "app", "ssl", false)),
                new Settings(Map.of("password", password)));
    }

    private static SourceRef orders(int maxRows) {
        return new SourceRef(1L, connection(1L, "s3cret"), new Settings(Map.of("table", "orders")), null,
                List.of("id", "customer", "amount", "paid", "due"), maxRows);
    }

    @Test
    void describes_the_table_with_its_primary_key_and_column_types() {
        connector.test(connection(null, "s3cret"));
        assertThat(connector.targets(connection(null, "s3cret"), Settings.EMPTY)).contains("orders");

        SourceSchema schema = connector.describe(orders(100));
        assertThat(schema.keyColumn()).isEqualTo("id");
        assertThat(schema.columns()).containsExactly(new ColumnInfo("id", "number"), new ColumnInfo("customer", "text"),
                new ColumnInfo("amount", "number"), new ColumnInfo("paid", "boolean"), new ColumnInfo("due", "date"));
    }

    @Test
    void reads_rows_as_text_with_their_keys_and_says_when_there_are_more() {
        LiveRows rows = connector.read(orders(100));
        assertThat(rows.rows()).containsExactly(
                new LiveRow("1", List.of("1", "Ada", "750.00", "true", "2026-01-31")),
                new LiveRow("2", List.of("2", "Bob", "20.50", "false", "")));
        assertThat(rows.truncated()).isFalse();

        LiveRows first = connector.read(orders(1));
        assertThat(first.rows()).hasSize(1);
        assertThat(first.truncated()).isTrue();
    }

    @Test
    void adds_changes_and_deletes_rows_by_key_converting_text_to_the_columns_types() {
        LiveRow cleo = connector.insert(orders(100), Map.of("customer", "Cleo", "amount", "12.5", "paid", "true", "due", ""));
        assertThat(cleo.id()).isEqualTo("3");
        assertThat(cleo.values()).containsExactly("3", "Cleo", "12.50", "true", "");

        LiveRow changed = connector.update(orders(100), "2", Map.of("paid", "true", "amount", ""));
        assertThat(changed.values()).containsExactly("2", "Bob", "", "true", "");

        connector.delete(orders(100), List.of("1", "999"));
        assertThat(connector.read(orders(100)).rows()).extracting(LiveRow::id).containsExactly("2", "3");
        assertThat(connector.get(orders(100), "1")).isEmpty();
        assertThatThrownBy(() -> connector.update(orders(100), "1", Map.of("customer", "x"))).isInstanceOf(RowNotFoundException.class);
    }

    @Test
    void only_tables_the_database_describes_are_named_and_errors_say_what_went_wrong() {
        SourceRef injected = new SourceRef(1L, connection(1L, "s3cret"),
                new Settings(Map.of("table", "orders; drop table orders")), null, List.of(), 100);
        assertThatThrownBy(() -> connector.read(injected)).isInstanceOf(ConnectorException.class).hasMessageContaining("no table");
        assertThat(connector.read(orders(100)).rows()).hasSize(2);

        assertThatThrownBy(() -> connector.test(connection(null, "wrong"))).isInstanceOf(ConnectorException.class)
                .hasMessageContaining("could not connect").hasMessageNotContaining("wrong");
        assertThatThrownBy(() -> connector.insert(orders(100), Map.of("amount", "lots")))
                .isInstanceOf(ConnectorException.class).hasMessageContaining("could not add the row");
    }

    @Test
    void private_hosts_are_refused_unless_allowed() {
        JdbcConnector strict = new JdbcConnector(new PublicAddressGuard(new LiveDataProperties(null, "k1", List.of(), 5000, false, 600, 3, null)));
        assertThatThrownBy(() -> strict.test(connection(null, "s3cret"))).isInstanceOf(ConnectorException.class)
                .hasMessageContaining("private network");
    }
}
