package com.example.ntbd.mapper;

import com.example.ntbd.domain.DataSource;
import com.example.ntbd.domain.DataSourceCell;
import com.example.ntbd.domain.DataSourceColumn;
import com.example.ntbd.domain.DataSourceRow;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.dto.DataSourceSummaryDto;
import com.example.ntbd.livedata.connector.LiveRow;
import com.example.ntbd.livedata.connector.LiveRows;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public class DataSourceMapper {

    public static DataSourceSummaryDto toSummaryDto(DataSource dataSource) {
        if (dataSource == null) return null;

        return new DataSourceSummaryDto(
                id(dataSource),
                dataSource.getName(),
                dataSource.getFormat(),
                branchId(dataSource),
                columnNames(dataSource),
                dataSource.isEmbedded() ? dataSource.getRows().size() : 0,
                dataSource.getKind(),
                connectionId(dataSource),
                dataSource.getKeyColumn(),
                dataSource.isReadOnly()
        );
    }

    /** An embedded data source with its rows (in order; ids are the rows' database ids). */
    public static DataSourceDto toDto(DataSource dataSource) {
        if (dataSource == null) return null;

        int columnCount = dataSource.getColumns().size();
        List<DataSourceRow> rows = dataSource.getRows().stream()
                .sorted(Comparator.comparingInt(DataSourceRow::getRowIndex))
                .toList();
        return new DataSourceDto(
                id(dataSource),
                dataSource.getName(),
                dataSource.getFormat(),
                branchId(dataSource),
                columnNames(dataSource),
                rows.stream().map(row -> values(row, columnCount)).toList(),
                rows.stream().map(row -> String.valueOf(row.getId())).toList(),
                dataSource.getKind(),
                connectionId(dataSource),
                null,
                dataSource.getKeyColumn(),
                dataSource.isReadOnly(),
                false
        );
    }

    /** A live data source with the rows just read from its system. */
    public static DataSourceDto toDto(DataSource dataSource, Map<String, Object> settings, LiveRows rows) {
        return new DataSourceDto(
                id(dataSource),
                dataSource.getName(),
                dataSource.getFormat(),
                branchId(dataSource),
                rows.columns(),
                rows.rows().stream().map(LiveRow::values).toList(),
                rows.rows().stream().map(LiveRow::id).toList(),
                dataSource.getKind(),
                connectionId(dataSource),
                settings,
                dataSource.getKeyColumn(),
                dataSource.isReadOnly(),
                rows.truncated()
        );
    }

    /** The row's values in column order; columns without a cell are empty. */
    private static List<String> values(DataSourceRow row, int columnCount) {
        List<String> values = new ArrayList<>(Collections.nCopies(columnCount, ""));
        for (DataSourceCell cell : row.getCells()) {
            int index = cell.getColumn().getColumnIndex();
            if (index >= 0 && index < columnCount) {
                values.set(index, cell.getValue() != null ? cell.getValue() : "");
            }
        }
        return values;
    }

    private static List<String> columnNames(DataSource dataSource) {
        return dataSource.getColumns().stream()
                .sorted(Comparator.comparingInt(DataSourceColumn::getColumnIndex))
                .map(DataSourceColumn::getName)
                .toList();
    }

    private static Long id(DataSource dataSource) {
        return dataSource.getId() != null ? dataSource.getId().id() : null;
    }

    private static Long connectionId(DataSource dataSource) {
        return dataSource.getConnection() != null ? dataSource.getConnection().getId() : null;
    }

    private static Long branchId(DataSource dataSource) {
        return dataSource.getBranch() != null && dataSource.getBranch().getId() != null
                ? dataSource.getBranch().getId().id()
                : null;
    }
}
