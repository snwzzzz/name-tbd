package com.example.ntbd.commands;

import java.util.Map;

/**
 * Adds a live data source to a branch (or changes one): what to read through which connection.
 *
 * @param settings  what to read there, e.g. {@code {"table": "orders"}} or {@code {"spreadsheet": "<link>", "sheet": "Orders"}}
 * @param keyColumn the column identifying rows; null: the table's primary key, or the connector's own ids
 * @param readOnly  apps may only read it
 */
public record LiveDataSourceCommand(
        Long branchId,
        String name,
        Long connectionId,
        Map<String, Object> settings,
        String keyColumn,
        Boolean readOnly
) {
}
