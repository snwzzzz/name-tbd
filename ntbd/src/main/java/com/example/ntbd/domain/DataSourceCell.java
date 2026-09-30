package com.example.ntbd.domain;

import jakarta.persistence.*;
import lombok.*;

/** The value of one row in one column. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "\"data_source_cell\"")
public class DataSourceCell {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "row_id", nullable = false)
    private DataSourceRow row;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "column_id", nullable = false)
    private DataSourceColumn column;

    @Column(name = "cell_value", columnDefinition = "TEXT")
    private String value;
}
