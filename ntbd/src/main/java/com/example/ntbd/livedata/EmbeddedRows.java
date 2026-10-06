package com.example.ntbd.livedata;

import com.example.ntbd.Exception.DataSourceNotFoundException;
import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.domain.DataSource;
import com.example.ntbd.domain.DataSourceCell;
import com.example.ntbd.domain.DataSourceColumn;
import com.example.ntbd.domain.DataSourceRow;
import com.example.ntbd.livedata.connector.LiveRow;
import com.example.ntbd.livedata.connector.LiveRows;
import com.example.ntbd.persistence.DataSourceRepository;
import com.example.ntbd.persistence.DataSourceRowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The rows of an embedded data source (stored here) as live rows: a row's id is its database id, so it
 * stays the same while others add or delete rows. This is what "live" means for an imported CSV file:
 * every user of the app shares the rows on this server.
 */
@Component
@RequiredArgsConstructor
public class EmbeddedRows {

    /** As for imports (DataSourceService.MAX_ROWS): every cell is a database row of its own. */
    static final int MAX_ROWS = 1000;

    private final DataSourceRepository sources;
    private final DataSourceRowRepository rows;

    @Transactional(readOnly = true)
    public LiveRows read(Long sourceId) {
        DataSource source = source(sourceId);
        List<String> columns = columnNames(source);
        List<LiveRow> result = source.getRows().stream()
                .sorted(Comparator.comparingInt(DataSourceRow::getRowIndex).thenComparing(DataSourceRow::getId))
                .map(row -> liveRow(row, columns.size()))
                .toList();
        return new LiveRows(columns, result, false);
    }

    @Transactional(readOnly = true)
    public Optional<LiveRow> get(Long sourceId, String rowId) {
        int columnCount = source(sourceId).getColumns().size();
        return parseId(rowId).flatMap(id -> rows.findInSource(sourceId, id)).map(row -> liveRow(row, columnCount));
    }

    @Transactional
    public LiveRow insert(Long sourceId, Map<String, String> values) {
        DataSource source = source(sourceId);
        if (rows.countInSource(sourceId) >= MAX_ROWS) {
            throw new IllegalArgumentException("This data source already has " + MAX_ROWS + " rows, the most it can have");
        }
        DataSourceRow row = DataSourceRow.builder().dataSource(source).rowIndex(rows.maxRowIndex(sourceId) + 1).build();
        setValues(row, columns(source), values);
        // Also in the source's rows, so a later read in the same transaction sees it
        source.getRows().add(row);
        DataSourceRow saved = rows.saveAndFlush(row);
        return liveRow(saved, source.getColumns().size());
    }

    @Transactional
    public LiveRow update(Long sourceId, String rowId, Map<String, String> values) {
        DataSource source = source(sourceId);
        DataSourceRow row = parseId(rowId).flatMap(id -> rows.findInSource(sourceId, id))
                .orElseThrow(() -> new RowNotFoundException(rowId));
        setValues(row, columns(source), values);
        rows.saveAndFlush(row);
        return liveRow(row, source.getColumns().size());
    }

    @Transactional
    public void delete(Long sourceId, List<String> rowIds) {
        List<Long> ids = rowIds.stream().map(EmbeddedRows::parseId).flatMap(Optional::stream).toList();
        if (ids.isEmpty()) return;
        DataSource source = source(sourceId);
        List<DataSourceRow> found = rows.findAllInSource(sourceId, ids);
        source.getRows().removeAll(found);
        rows.deleteAll(found);
    }

    /** Sets the given columns' values; a value for a column the source doesn't have is an error. */
    private static void setValues(DataSourceRow row, List<DataSourceColumn> columns, Map<String, String> values) {
        values.forEach((name, value) -> {
            DataSourceColumn column = columns.stream().filter(c -> c.getName().equals(name)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("The data source has no column \"" + name + "\""));
            Optional<DataSourceCell> cell = row.getCells().stream().filter(c -> c.getColumn() == column
                    || (c.getColumn().getId() != null && c.getColumn().getId().equals(column.getId()))).findFirst();
            if (cell.isPresent()) {
                cell.get().setValue(value);
            } else {
                row.getCells().add(DataSourceCell.builder().row(row).column(column).value(value).build());
            }
        });
    }

    private static LiveRow liveRow(DataSourceRow row, int columnCount) {
        List<String> values = new ArrayList<>(Collections.nCopies(columnCount, ""));
        for (DataSourceCell cell : row.getCells()) {
            int index = cell.getColumn().getColumnIndex();
            if (index >= 0 && index < columnCount && cell.getValue() != null) values.set(index, cell.getValue());
        }
        return new LiveRow(String.valueOf(row.getId()), values);
    }

    private static List<DataSourceColumn> columns(DataSource source) {
        return source.getColumns().stream().sorted(Comparator.comparingInt(DataSourceColumn::getColumnIndex)).toList();
    }

    private static List<String> columnNames(DataSource source) {
        return columns(source).stream().map(DataSourceColumn::getName).toList();
    }

    private DataSource source(Long id) {
        return sources.findById(new DataSource.DataSourceId(id)).orElseThrow(() -> new DataSourceNotFoundException(id));
    }

    private static Optional<Long> parseId(String rowId) {
        try {
            return Optional.of(Long.parseLong(rowId));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }
}
