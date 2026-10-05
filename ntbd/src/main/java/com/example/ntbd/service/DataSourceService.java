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
import com.example.ntbd.Exception.ConnectionNotFoundException;
import com.example.ntbd.commands.LiveDataSourceCommand;
import com.example.ntbd.domain.DataConnection;
import com.example.ntbd.livedata.LiveDataService;
import com.example.ntbd.livedata.connector.ColumnInfo;
import com.example.ntbd.livedata.connector.LiveRows;
import com.example.ntbd.livedata.connector.Settings;
import com.example.ntbd.livedata.connector.SourceRef;
import com.example.ntbd.livedata.connector.SourceSchema;
import com.example.ntbd.mapper.DataSourceMapper;
import com.example.ntbd.persistence.BranchRepository;
import com.example.ntbd.persistence.DataConnectionRepository;
import com.example.ntbd.persistence.DataSourceRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RequiredArgsConstructor
@Service
public class DataSourceService {

    /** Data sources are meant for small, simple data sets; every cell is stored as its own row. */
    static final int MAX_ROWS = 1000;

    private final DataSourceRepository dataSourceRepository;
    private final BranchRepository branchRepository;
    private final TabularDataParserRegistry parserRegistry;
    private final DataConnectionRepository connectionRepository;
    private final LiveDataService liveData;
    private final TransactionTemplate transactions;

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

    /**
     * A data source with its rows: an embedded one's from here, a live one's read from its system now
     * (outside a transaction, so a slow system holds none).
     */
    public DataSourceDto findById(Long id) {
        LiveDataService.SourceView view = liveData.view(id);
        if (view.embedded()) {
            return transactions.execute(status -> DataSourceMapper.toDto(getDataSource(id)));
        }
        LiveRows rows = liveData.read(id);
        return transactions.execute(status -> {
            DataSource source = getDataSource(id);
            return DataSourceMapper.toDto(source, liveData.parse(source.getSettings()).values(), rows);
        });
    }

    /**
     * Adds a live data source: what to read through one of the workspace's connections. Its columns (and
     * key column) are asked from the system right away, so a source that can't be read isn't added.
     */
    public DataSourceDto createLive(LiveDataSourceCommand command) {
        if (command.name() == null || command.name().isBlank()) {
            throw new IllegalArgumentException("Data source name must not be blank");
        }
        Described described = describe(command.branchId(), command.connectionId(), command.settings(), command.keyColumn());
        Long id = transactions.execute(status -> {
            Branch branch = branchRepository.findById(new Branch.BranchId(command.branchId()))
                    .orElseThrow(() -> new BranchNotFoundException(command.branchId()));
            DataConnection connection = connectionRepository.findById(command.connectionId())
                    .orElseThrow(() -> new ConnectionNotFoundException(command.connectionId()));
            DataSource source = DataSource.builder()
                    .name(command.name().trim())
                    .format(connection.getKind())
                    .kind(connection.getKind())
                    .connection(connection)
                    .branch(branch)
                    .readOnly(Boolean.TRUE.equals(command.readOnly()))
                    .build();
            apply(source, described);
            return dataSourceRepository.saveAndFlush(source).getId().id();
        });
        return findById(id);
    }

    /** Changes what a live data source reads (and its name, key column, read-only flag); its columns are asked anew. */
    public DataSourceDto updateLive(Long id, LiveDataSourceCommand command) {
        LiveDataService.SourceView view = liveData.view(id);
        if (view.embedded()) throw new IllegalArgumentException("An embedded data source has no connection to change");
        Long branchId = transactions.execute(status -> getDataSource(id).getBranch().getId().id());
        Long connectionId = command.connectionId() != null ? command.connectionId()
                : transactions.execute(status -> {
                    DataConnection connection = getDataSource(id).getConnection();
                    if (connection == null) throw new IllegalArgumentException("Choose a connection for this data source");
                    return connection.getId();
                });
        Map<String, Object> settings = command.settings() != null ? command.settings()
                : transactions.execute(status -> liveData.parse(getDataSource(id).getSettings()).values());
        String keyColumn = command.keyColumn() != null ? (command.keyColumn().isBlank() ? null : command.keyColumn()) : view.keyColumn();
        Described described = describe(branchId, connectionId, settings, keyColumn);
        transactions.executeWithoutResult(status -> {
            DataSource source = getDataSource(id);
            if (command.name() != null && !command.name().isBlank()) source.setName(command.name().trim());
            if (command.readOnly() != null) source.setReadOnly(command.readOnly());
            DataConnection connection = connectionRepository.findById(connectionId)
                    .orElseThrow(() -> new ConnectionNotFoundException(connectionId));
            source.setConnection(connection);
            source.setKind(connection.getKind());
            source.setFormat(connection.getKind());
            apply(source, described);
        });
        liveData.forget(id);
        return findById(id);
    }

    /** A live source's columns, asked from its system again (e.g. after columns were added there). */
    public DataSourceDto refreshSchema(Long id) {
        LiveDataService.SourceView view = liveData.view(id);
        if (view.embedded()) throw new IllegalArgumentException("An embedded data source has no connection to describe");
        SourceSchema schema = liveData.describe(id);
        transactions.executeWithoutResult(status -> {
            DataSource source = getDataSource(id);
            apply(source, new Described(liveData.parse(source.getSettings()).values(), schema, view.keyColumn()));
        });
        liveData.forget(id);
        return findById(id);
    }

    private record Described(Map<String, Object> settings, SourceSchema schema, String keyColumn) {
    }

    /** Asks the connection's system what the settings point at; the connection must be in the branch's workspace. */
    private Described describe(Long branchId, Long connectionId, Map<String, Object> settings, String keyColumn) {
        if (connectionId == null) throw new IllegalArgumentException("Choose a connection");
        DataConnection connection = transactions.execute(status -> {
            Branch branch = branchRepository.findById(new Branch.BranchId(branchId))
                    .orElseThrow(() -> new BranchNotFoundException(branchId));
            DataConnection found = connectionRepository.findById(connectionId)
                    .orElseThrow(() -> new ConnectionNotFoundException(connectionId));
            if (!Objects.equals(found.getWorkspace().getId().id(), branch.getApplication().getWorkspace().getId().id())) {
                // Another workspace's connection doesn't exist, as far as this app knows
                throw new ConnectionNotFoundException(connectionId);
            }
            return found;
        });
        Map<String, Object> cleaned = new LinkedHashMap<>(settings == null ? Map.of() : settings);
        cleaned.remove("columnTypes");
        String key = keyColumn == null || keyColumn.isBlank() ? null : keyColumn.trim();
        SourceRef ref = new SourceRef(null, liveData.connectionRef(connection), new Settings(cleaned), key, List.of(), liveData.maxRows());
        SourceSchema schema = liveData.connector(connection.getKind()).describe(ref);
        return new Described(cleaned, schema, key);
    }

    /** Stores what was described: settings (with the column types), the key column and the columns. */
    private void apply(DataSource source, Described described) {
        Map<String, Object> settings = new LinkedHashMap<>(described.settings());
        Map<String, String> types = new LinkedHashMap<>();
        described.schema().columns().forEach(column -> types.put(column.name(), column.type()));
        settings.put("columnTypes", types);
        source.setSettings(liveData.json(new Settings(settings)));
        source.setKeyColumn(described.keyColumn() != null ? described.keyColumn() : described.schema().keyColumn());
        source.getColumns().clear();
        List<ColumnInfo> columns = described.schema().columns();
        for (int i = 0; i < columns.size(); i++) {
            source.getColumns().add(DataSourceColumn.builder().dataSource(source).columnIndex(i).name(columns.get(i).name()).build());
        }
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
