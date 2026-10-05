package com.example.ntbd.export.definition.contributors;

import com.example.ntbd.catalog.WidgetCatalog;
import com.example.ntbd.content.BranchContent.DataSourceContent;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionContributor;
import com.example.ntbd.export.definition.ColumnUsage;
import com.example.ntbd.export.definition.ExportScope;
import com.example.ntbd.livedata.LiveDataService;
import com.example.ntbd.livedata.connector.LiveRow;
import com.example.ntbd.livedata.connector.LiveRows;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The app's data sources. Sections "dataSources" and "dataRevision" (a fingerprint of the data, so a browser
 * only reuses its changes for the same exported data).
 * <ul>
 *   <li><b>Embedded</b> ({@code DataMode.EMBED}): each source with its rows (a live source's read from its
 *       system now), but only the columns the app uses ({@link ColumnUsage}), since anyone who has the file can
 *       read them. The exported app changes its own copy, in the browser.</li>
 *   <li><b>Live</b>: each source with its columns and no rows; the exported app reads and writes them through
 *       the data API (section "liveData", {@link LiveDataContributor}).</li>
 * </ul>
 * Rows carry ids (database ids, or key column values), never positions.
 */
@Component
@Order(200)
@RequiredArgsConstructor
public class DataSourcesContributor implements AppDefinitionContributor {

    private final ObjectMapper objectMapper;
    private final WidgetCatalog catalog;
    private final LiveDataService liveData;

    @Override
    public void contribute(ExportScope scope, AppDefinition definition) {
        boolean live = scope.options().dataMode().live();
        Map<Long, ColumnUsage.Used> usage = ColumnUsage.of(scope.content(), catalog, objectMapper);
        List<DataSourceSnapshot> snapshots = scope.content().dataSources().stream()
                .map(source -> live ? liveSnapshot(source)
                        : embeddedSnapshot(source, scope.options().allColumns() ? null : usage.get(source.id())))
                .toList();
        definition.put("dataSources", snapshots);
        definition.put("dataRevision", fingerprint(objectMapper.writeValueAsString(snapshots)));
    }

    /** The rows (of the used columns), each value non-null. */
    private DataSourceSnapshot embeddedSnapshot(DataSourceContent source, ColumnUsage.Used used) {
        List<String> columns;
        List<List<String>> rows;
        List<String> rowIds;
        if (source.isEmbedded()) {
            columns = source.columns();
            rows = source.rows();
            rowIds = source.rowIds();
        } else {
            LiveRows read = liveData.read(source.id());
            columns = read.columns();
            rows = read.rows().stream().map(LiveRow::values).toList();
            rowIds = read.rows().stream().map(LiveRow::id).toList();
        }
        List<Integer> kept = new ArrayList<>();
        for (int i = 0; i < columns.size(); i++) {
            if (used == null || used.uses(columns.get(i))) kept.add(i);
        }
        List<List<String>> values = rows.stream()
                .map(row -> kept.stream().map(i -> i < row.size() ? Objects.requireNonNullElse(row.get(i), "") : "").toList())
                .toList();
        return new DataSourceSnapshot(source.id(), Objects.requireNonNullElse(source.name(), ""),
                kept.stream().map(columns::get).toList(), values, rowIds, "embedded", source.keyColumn(), source.readOnly());
    }

    /** Only what the source is: its rows come from the data API. */
    private static DataSourceSnapshot liveSnapshot(DataSourceContent source) {
        return new DataSourceSnapshot(source.id(), Objects.requireNonNullElse(source.name(), ""), source.columns(),
                List.of(), List.of(), "live", source.keyColumn(), source.readOnly());
    }

    private static String fingerprint(String content) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(content.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash, 0, 8);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    /**
     * A data source as the exported app gets it.
     *
     * @param rowIds the rows' ids, in order (older exports have none: rows are then known by position)
     * @param mode   "embedded" (rows are here) or "live" (rows come from the data API)
     */
    public record DataSourceSnapshot(Long id, String name, List<String> columns, List<List<String>> rows,
                                     List<String> rowIds, String mode, String keyColumn, boolean readOnly) {
    }
}
