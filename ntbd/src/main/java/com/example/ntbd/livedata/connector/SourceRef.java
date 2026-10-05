package com.example.ntbd.livedata.connector;

import java.util.List;

/**
 * A live data source as its connector gets it.
 *
 * @param settings  what to read through the connection (table, range, path, ...)
 * @param keyColumn the column identifying rows (null: the connector's own row ids, if it has any)
 * @param columns   the columns as last described (may be empty before the first description)
 * @param maxRows   the most rows to read
 */
public record SourceRef(Long id, ConnectionRef connection, Settings settings, String keyColumn, List<String> columns,
                        int maxRows) {
}
