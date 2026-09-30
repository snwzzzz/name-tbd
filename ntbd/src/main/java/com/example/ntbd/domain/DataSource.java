package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/** Tabular data (e.g. an imported CSV file) that the pages of a branch can use. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "\"data_source\"")
public class DataSource extends AuditableEntity {

    @EmbeddedId
    private DataSourceId id;

    @Column(nullable = false)
    private String name;

    /** The format the data was imported from, e.g. "csv". */
    @Column(nullable = false)
    private String format;

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

    @Embeddable
    public record DataSourceId(@GeneratedValue Long id) {}
}
