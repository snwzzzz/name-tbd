package com.example.ntbd.dto;

import java.util.List;
import java.util.Map;

/**
 * A data source with its rows; each row holds one value per column, in column order, and has the id at the
 * same index of {@code rowIds} (stable: a database id or the key column's value, never a position).
 *
 * @param kind         "embedded" (rows stored here) or the kind of connection it's read through
 * @param connectionId the connection of a live source (null: embedded, or the connection was deleted)
 * @param settings     what a live source reads (table, sheet, path, ...); never secrets
 * @param keyColumn    the column identifying rows (null: the connector's own ids)
 * @param truncated    the source had more rows than were read (live sources answer at most app.data.max-rows)
 */
public record DataSourceDto(
        Long id,
        String name,
        String format,
        Long branchId,
        List<String> columns,
        List<List<String>> rows,
        List<String> rowIds,
        String kind,
        Long connectionId,
        Map<String, Object> settings,
        String keyColumn,
        boolean readOnly,
        boolean truncated
) {
    public DataSourceDto(Long id, String name, String format, Long branchId, List<String> columns, List<List<String>> rows) {
        this(id, name, format, branchId, columns, rows, null, "embedded", null, null, null, false, false);
    }
}
