package com.example.ntbd.livedata.connector;

import java.util.List;

/**
 * What a source has: its columns and the column that identifies rows.
 *
 * @param keyColumn null when the connector identifies rows itself (e.g. SharePoint list item ids)
 */
public record SourceSchema(List<ColumnInfo> columns, String keyColumn) {

    public List<String> names() {
        return columns.stream().map(ColumnInfo::name).toList();
    }
}
