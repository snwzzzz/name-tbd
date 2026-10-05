package com.example.ntbd.dto;

import java.util.List;

/**
 * A data source without its rows, for listings. {@code rowCount} is only known for embedded sources (0 for
 * live ones, whose rows are where the customer keeps them).
 */
public record DataSourceSummaryDto(
        Long id,
        String name,
        String format,
        Long branchId,
        List<String> columns,
        int rowCount,
        String kind,
        Long connectionId,
        String keyColumn,
        boolean readOnly
) {
    public DataSourceSummaryDto(Long id, String name, String format, Long branchId, List<String> columns, int rowCount) {
        this(id, name, format, branchId, columns, rowCount, "embedded", null, null, false);
    }
}
