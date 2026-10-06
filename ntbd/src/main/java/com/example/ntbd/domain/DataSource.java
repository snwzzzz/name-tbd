package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Tabular data that the pages of a branch can use: rows stored here ({@link #EMBEDDED}, e.g. an imported
 * CSV file), or read and written through a {@link DataConnection} (a database table, a spreadsheet, an API).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
// Deleted rows (SoftDeleteService) are invisible to every query; native SQL still sees them (restore, purge)
@org.hibernate.annotations.SQLRestriction("deleted_at is null")
@Table(name = "\"data_source\"")
public class DataSource extends AuditableEntity {

    @EmbeddedId
    private DataSourceId id;

    /** When it was deleted (it's kept a while, so the deletion can be undone); null while it exists. */
    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;

    @Column(nullable = false)
    private String name;

    /** The format the data was imported from, e.g. "csv"; for a live source, its connector's kind. */
    @Column(nullable = false)
    private String format;

    /** {@link #EMBEDDED}, or the kind of connector it is read through (see livedata.connector). */
    @Column(nullable = false)
    @Builder.Default
    private String kind = EMBEDDED;

    /** Where a live source's data is (null for embedded ones, or when the connection was deleted). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connection_id")
    private DataConnection connection;

    /** JSON: what to read through the connection (a table, a sheet's range, an API path, ...). */
    @Column(columnDefinition = "TEXT")
    private String settings;

    /** The column that identifies a row (a primary key); null: the connector's own row ids. */
    @Column(name = "key_column")
    private String keyColumn;

    /** Apps may read but not change it. */
    @Column(name = "read_only", nullable = false)
    private boolean readOnly;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "dataSource")
    @OrderBy("columnIndex")
    @Builder.Default
    private List<DataSourceColumn> columns = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "dataSource")
    @OrderBy("rowIndex")
    @Builder.Default
    private List<DataSourceRow> rows = new ArrayList<>();

    public static final String EMBEDDED = "embedded";

    public boolean isEmbedded() {
        return EMBEDDED.equals(kind);
    }

    @Embeddable
    public record DataSourceId(@GeneratedValue Long id) {}
}
