package com.example.ntbd.datasource;

import java.util.List;

/**
 * Tabular data as read by a {@link TabularDataParser}: the column names and, per row, one value
 * per column (in column order).
 */
public record ParsedTable(List<String> columns, List<List<String>> rows) {

    public ParsedTable {
        columns = List.copyOf(columns);
        rows = rows.stream().map(List::copyOf).toList();
    }
}
