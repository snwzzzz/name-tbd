package com.example.ntbd.service;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.Exception.DataSourceNotFoundException;
import com.example.ntbd.commands.NewDataSourceCommand;
import com.example.ntbd.datasource.ParsedTable;
import com.example.ntbd.datasource.TabularDataParserRegistry;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.domain.DataSource;
import com.example.ntbd.domain.DataSourceCell;
import com.example.ntbd.domain.DataSourceColumn;
import com.example.ntbd.domain.DataSourceRow;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.dto.DataSourceSummaryDto;
import com.example.ntbd.mapper.DataSourceMapper;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.DataSourceRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class DataSourceService {

    /** Data sources are meant for small, simple data sets; every cell is stored as its own row. */
    static final int MAX_ROWS = 1000;

    private final DataSourceRepository dataSourceRepository;
    private final BranchRepository branchRepository;
    private final TabularDataParserRegistry parserRegistry;

    @Transactional
    public DataSourceDto importDataSource(NewDataSourceCommand command) {
        if (command.name() == null || command.name().isBlank()) {
            throw new IllegalArgumentException("Data source name must not be blank");
        }
        Branch branch = branchRepository.findById(new Branch.BranchId(command.branchId()))
                .orElseThrow(() -> new BranchNotFoundException(command.branchId()));

        ParsedTable table = parserRegistry.getParser(command.format()).parse(command.content());
        if (table.rows().size() > MAX_ROWS) {
            throw new IllegalArgumentException("Data source has " + table.rows().size()
                    + " rows; at most " + MAX_ROWS + " are supported");
        }

        DataSource dataSource = DataSource.builder()
                .name(command.name().trim())
                .format(command.format().trim().toLowerCase())
                .branch(branch)
                .build();
        List<DataSourceColumn> columns = dataSource.getColumns();
        for (int i = 0; i < table.columns().size(); i++) {
            columns.add(DataSourceColumn.builder().dataSource(dataSource).columnIndex(i).name(table.columns().get(i)).build());
        }
        for (int i = 0; i < table.rows().size(); i++) {
            dataSource.getRows().add(toRow(dataSource, i, table.rows().get(i), columns));
        }

        return DataSourceMapper.toDto(dataSourceRepository.saveAndFlush(dataSource));
    }

    @Transactional
    public List<DataSourceSummaryDto> findByBranchId(Long branchId) {
        return dataSourceRepository.findByBranch_IdOrderByNameAsc(new Branch.BranchId(branchId)).stream()
                .map(DataSourceMapper::toSummaryDto)
                .toList();
    }

    @Transactional
    public DataSourceDto findById(Long id) {
        return DataSourceMapper.toDto(getDataSource(id));
    }

    /** Replaces a data source's rows (e.g. after a flow ran on the server), keeping its columns. */
    @Transactional
    public void replaceRows(Long id, List<List<String>> rows) {
        DataSource dataSource = getDataSource(id);
        if (rows.size() > MAX_ROWS) {
            throw new IllegalArgumentException("Data source would have " + rows.size() + " rows; at most " + MAX_ROWS + " are supported");
        }
        List<DataSourceColumn> columns = dataSource.getColumns().stream()
                .sorted(java.util.Comparator.comparingInt(DataSourceColumn::getColumnIndex))
                .toList();
        dataSource.getRows().clear();
        // The old rows go first, so new ones can take their indexes
        dataSourceRepository.saveAndFlush(dataSource);
        for (int i = 0; i < rows.size(); i++) {
            List<String> values = rows.get(i).subList(0, Math.min(rows.get(i).size(), columns.size()));
            dataSource.getRows().add(toRow(dataSource, i, values, columns));
        }
        dataSourceRepository.save(dataSource);
    }

    private DataSource getDataSource(Long id) {
        return dataSourceRepository.findById(new DataSource.DataSourceId(id))
                .orElseThrow(() -> new DataSourceNotFoundException(id));
    }

    private static DataSourceRow toRow(DataSource dataSource, int rowIndex, List<String> values, List<DataSourceColumn> columns) {
        DataSourceRow row = DataSourceRow.builder().dataSource(dataSource).rowIndex(rowIndex).build();
        for (int i = 0; i < values.size(); i++) {
            if (values.get(i) == null) continue;
            row.getCells().add(DataSourceCell.builder().row(row).column(columns.get(i)).value(values.get(i)).build());
        }
        return row;
    }
}
