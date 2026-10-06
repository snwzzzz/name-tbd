package com.example.ntbd.controller;

import com.example.ntbd.Exception.DataSourceNotFoundException;
import com.example.ntbd.Exception.ForbiddenException;
import com.example.ntbd.Exception.RowNotFoundException;
import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.domain.WorkspaceRole;
import com.example.ntbd.livedata.LiveDataService;
import com.example.ntbd.livedata.appkey.AppKeyAuthentication;
import com.example.ntbd.livedata.appkey.AppKeyService;
import com.example.ntbd.livedata.connector.LiveRow;
import com.example.ntbd.livedata.connector.LiveRows;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Rows of a data source, for apps: exported apps call it with their app key (DataApiSecurityConfig), the
 * editor's preview with its session. Exported apps never hold credentials for the customer's systems: they
 * ask here, and this server asks the system ({@link LiveDataService}).
 * <ul>
 *   <li>An app key opens only the data sources of its own app, and changes them only if it allows writes.</li>
 *   <li>A signed-in user needs to be a viewer of the workspace to read, an editor to change.</li>
 * </ul>
 * Rows are identified by id in the body or query, never in the path (keys may hold any character).
 */
@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/data/{sourceId}", produces = "application/json")
public class DataApiController {

    private final LiveDataService liveData;
    private final WorkspaceAccess access;

    /** A source's rows (at most app.data.max-rows of a live one; {@code truncated} says when there were more). */
    public record DataPage(Long id, String name, List<String> columns, String keyColumn, boolean readOnly,
                           List<LiveRow> rows, boolean truncated) {
    }

    public record RowValues(Map<String, String> values) {
    }

    /**
     * A change to a row: its id, the columns to change, and (optional) the values they had when the change was
     * made, so changes made meanwhile by someone else are reported back as conflicts.
     */
    public record RowChange(String id, Map<String, String> values, Map<String, String> base) {
    }

    /** The row after a change; {@code conflicts}: the values someone else had set meanwhile (overwritten now). */
    public record ChangedRow(LiveRow row, Map<String, String> conflicts) {
    }

    public record RowIds(List<String> ids) {
    }

    @GetMapping
    public ResponseEntity<DataPage> rows(@PathVariable Long sourceId) {
        LiveDataService.SourceView source = allow(sourceId, false);
        LiveRows rows = liveData.read(sourceId);
        return ResponseEntity.ok(new DataPage(source.id(), source.name(), rows.columns(), source.keyColumn(),
                source.readOnly(), rows.rows(), rows.truncated()));
    }

    @GetMapping("/row")
    public ResponseEntity<LiveRow> row(@PathVariable Long sourceId, @RequestParam String id) {
        allow(sourceId, false);
        return ResponseEntity.ok(liveData.get(sourceId, id).orElseThrow(() -> new RowNotFoundException(id)));
    }

    @PostMapping("/rows")
    public ResponseEntity<LiveRow> addRow(@PathVariable Long sourceId, @RequestBody RowValues body) {
        allow(sourceId, true);
        return ResponseEntity.status(HttpStatus.CREATED).body(liveData.insert(sourceId, body.values()));
    }

    @PatchMapping("/rows")
    public ResponseEntity<ChangedRow> changeRow(@PathVariable Long sourceId, @RequestBody RowChange body) {
        allow(sourceId, true);
        if (body.id() == null || body.id().isBlank()) throw new IllegalArgumentException("Which row? (id)");
        LiveDataService.UpdateResult result = liveData.update(sourceId, body.id(), body.values(), body.base());
        return ResponseEntity.ok(new ChangedRow(result.row(), result.conflicts()));
    }

    /** Deletes rows; ids that are gone already are skipped. */
    @PostMapping("/rows/delete")
    public ResponseEntity<Void> deleteRows(@PathVariable Long sourceId, @RequestBody RowIds body) {
        allow(sourceId, true);
        liveData.delete(sourceId, body.ids() == null ? List.of() : body.ids());
        return ResponseEntity.noContent().build();
    }

    private LiveDataService.SourceView allow(Long sourceId, boolean write) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof AppKeyAuthentication appKey) {
            AppKeyService.AppKeyPrincipal principal = appKey.getPrincipal();
            LiveDataService.SourceView source = liveData.view(sourceId);
            // Another app's data doesn't exist, as far as this key knows
            if (!source.applicationId().equals(principal.applicationId())) throw new DataSourceNotFoundException(sourceId);
            if (write && !principal.allowWrites()) throw new ForbiddenException("This app may only read its data");
            return source;
        }
        access.requireDataSource(sourceId, write ? WorkspaceRole.EDITOR : WorkspaceRole.VIEWER);
        return liveData.view(sourceId);
    }
}
