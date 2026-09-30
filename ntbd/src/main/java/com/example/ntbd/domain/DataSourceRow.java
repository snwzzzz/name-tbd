package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "\"data_source_row\"")
public class DataSourceRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "data_source_id", nullable = false)
    private DataSource dataSource;

    @Column(name = "row_index", nullable = false)
    private int rowIndex;

    // Batched, so reading all rows of a data source doesn't load their cells one row at a time
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY, mappedBy = "row")
    @BatchSize(size = 100)
    @Builder.Default
    private List<DataSourceCell> cells = new ArrayList<>();
}
