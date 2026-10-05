package com.example.ntbd.export;

import com.example.ntbd.Exception.BranchNotFoundException;
import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.content.BranchContent;
import com.example.ntbd.content.BranchContentReader;
import com.example.ntbd.domain.Application;
import com.example.ntbd.domain.Branch;
import com.example.ntbd.export.definition.ColumnUsage;
import com.example.ntbd.export.definition.DataMode;
import com.example.ntbd.export.definition.ExportOptions;
import com.example.ntbd.livedata.LiveDataProperties;
import com.example.ntbd.livedata.appkey.AppKeyService;
import com.example.ntbd.persistence.BranchRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

/**
 * The data side of exporting: which data mode, a key for live exports, and what an embedded export would carry
 * (the export dialog shows it before downloading).
 */
@Service
public class ExportDataService {

    private final BranchRepository branches;
    private final BranchContentReader reader;
    private final WidgetCatalog catalog;
    private final ObjectMapper objectMapper;
    private final AppKeyService keys;
    private final TransactionTemplate transactions;
    private final String apiUrl;

    public ExportDataService(BranchRepository branches, BranchContentReader reader, WidgetCatalog catalog, ObjectMapper objectMapper,
                             AppKeyService keys, TransactionTemplate transactions, LiveDataProperties properties,
                             @Value("${app.frontend-url}") String frontendUrl) {
        this.branches = branches;
        this.reader = reader;
        this.catalog = catalog;
        this.objectMapper = objectMapper;
        this.keys = keys;
        this.transactions = transactions;
        String url = properties.publicUrl() != null && !properties.publicUrl().isBlank() ? properties.publicUrl() : frontendUrl;
        this.apiUrl = url.replaceAll("/+$", "");
    }

    /** What an export of a branch would do with each data source. */
    public record DataReport(String dataMode, List<SourceReport> sources) {
    }

    /**
     * @param exportedColumns the columns an embedded export carries
     * @param allBecause      why all columns are kept (null: only the used ones)
     */
    public record SourceReport(Long id, String name, String kind, List<String> columns, List<String> exportedColumns,
                               String allBecause) {
    }

    public DataReport report(Long branchId) {
        return transactions.execute(status -> {
            Branch branch = branch(branchId);
            BranchContent content = reader.read(branchId);
            Map<Long, ColumnUsage.Used> usage = ColumnUsage.of(content, catalog, objectMapper);
            List<SourceReport> sources = content.dataSources().stream().map(source -> {
                ColumnUsage.Used used = usage.get(source.id());
                List<String> exported = source.columns().stream().filter(used::uses).toList();
                return new SourceReport(source.id(), source.name(), source.kind(), source.columns(), exported, used.allBecause());
            }).toList();
            return new DataReport(branch.getApplication().getExportDataMode(), sources);
        });
    }

    /**
     * The options for exporting a branch now; remembers the data mode as the app's choice. A live export gets
     * a key of its own (revocable on its own).
     */
    public ExportOptions prepare(Long branchId, String dataMode, boolean allColumns) {
        record Choice(Long applicationId, DataMode mode) {
        }
        Choice choice = transactions.execute(status -> {
            Application application = branch(branchId).getApplication();
            DataMode chosen = dataMode == null ? DataMode.of(application.getExportDataMode()) : DataMode.of(dataMode);
            application.setExportDataMode(chosen.id());
            return new Choice(application.getId().id(), chosen);
        });
        Long applicationId = choice.applicationId();
        DataMode mode = choice.mode();
        if (!mode.live()) return new ExportOptions(DataMode.EMBED, null, null, allColumns);
        String label = (mode == DataMode.LIVE_CACHED ? "Live export with offline cache, " : "Live export, ")
                + LocalDate.now(ZoneOffset.UTC);
        AppKeyService.NewKey key = keys.create(applicationId, label, true);
        return new ExportOptions(mode, apiUrl, key.key(), allColumns);
    }

    /** The data mode an export without one uses: the app's last choice. */
    public DataMode modeOf(Long branchId, String dataMode) {
        if (dataMode != null) return DataMode.of(dataMode);
        return transactions.execute(status -> DataMode.of(branch(branchId).getApplication().getExportDataMode()));
    }

    private Branch branch(Long branchId) {
        return branches.findById(new Branch.BranchId(branchId)).orElseThrow(() -> new BranchNotFoundException(branchId));
    }
}
