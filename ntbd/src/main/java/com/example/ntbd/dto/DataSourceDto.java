package com.example.ntbd.dto;

import java.util.List;

/** A data source with its rows; each row holds one value per column, in column order. */
public record DataSourceDto(
        Long id,
        String name,
        String format,
        Long branchId,
        List<String> columns,
        List<List<String>> rows
) {
}
