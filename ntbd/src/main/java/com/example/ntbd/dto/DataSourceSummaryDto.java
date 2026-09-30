package com.example.ntbd.dto;

import java.util.List;

/** A data source without its rows, for listings. */
public record DataSourceSummaryDto(
        Long id,
        String name,
        String format,
        Long branchId,
        List<String> columns,
        int rowCount
) {
}
