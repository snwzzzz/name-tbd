package com.example.ntbd.mapper;

import com.example.ntbd.domain.DataSource;
import com.example.ntbd.domain.DataSourceCell;
import com.example.ntbd.domain.DataSourceColumn;
import com.example.ntbd.domain.DataSourceRow;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.dto.DataSourceSummaryDto;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class DataSourceMapper {

    public static DataSourceSummaryDto toSummaryDto(DataSource dataSource) {
        if (dataSource == null) return null;

        return new DataSourceSummaryDto(
                id(dataSource),
                dataSource.getName(),
                dataSource.getFormat(),
                branchId(dataSource),
                columnNames(dataSource),
                dataSource.getRows().size()
        );
    }

    public static DataSourceDto toDto(DataSource dataSource) {
        if (dataSource == null) return null;

        int columnCount = dataSource.getColumns().size();
        return new DataSourceDto(
                id(dataSource),
                dataSource.getName(),
                dataSource.getFormat(),
                branchId(dataSource),
                columnNames(dataSource),
                dataSource.getRows().stream().map(row -> values(row, columnCount)).toList()
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
        return dataSource.getColumns().stream().map(DataSourceColumn::getName).toList();
    }

    private static Long id(DataSource dataSource) {
        return dataSource.getId() != null ? dataSource.getId().id() : null;
    }

    private static Long branchId(DataSource dataSource) {
        return dataSource.getBranch() != null && dataSource.getBranch().getId() != null
                ? dataSource.getBranch().getId().id()
                : null;
    }
}
