package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.LiveDataSourceCommand;
import com.example.ntbd.commands.NewDataSourceCommand;
import com.example.ntbd.dto.DataSourceDto;
import com.example.ntbd.dto.DataSourceSummaryDto;
import com.example.ntbd.service.DataSourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/data-sources", produces = "application/json")
public class DataSourceController {

    private final DataSourceService dataSourceService;
    private final com.example.ntbd.service.SoftDeleteService softDelete;
    private final WorkspaceAccess access;

    /** Imports tabular data (e.g. the text of a CSV file) as a new data source. */
    @PostMapping
    public ResponseEntity<DataSourceDto> importDataSource(@RequestBody NewDataSourceCommand command) {
        access.requireBranch(command.branchId(), EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(dataSourceService.importDataSource(command));
    }

    /** Adds a live data source: rows read and written through one of the workspace's connections. */
    @PostMapping("/live")
    public ResponseEntity<DataSourceDto> createLiveDataSource(@RequestBody LiveDataSourceCommand command) {
        access.requireBranch(command.branchId(), EDITOR);
        access.requireConnection(command.connectionId(), VIEWER);
        return ResponseEntity.status(HttpStatus.CREATED).body(dataSourceService.createLive(command));
    }

    /** Changes what a live data source reads (connection, settings, key column, read-only, name). */
    @PatchMapping("/{id}/live")
    public ResponseEntity<DataSourceDto> updateLiveDataSource(@PathVariable Long id, @RequestBody LiveDataSourceCommand command) {
        access.requireDataSource(id, EDITOR);
        if (command.connectionId() != null) access.requireConnection(command.connectionId(), VIEWER);
        return ResponseEntity.ok(dataSourceService.updateLive(id, command));
    }

    /** Asks a live data source's system for its columns again. */
    @PostMapping("/{id}/refresh-schema")
    public ResponseEntity<DataSourceDto> refreshSchema(@PathVariable Long id) {
        access.requireDataSource(id, EDITOR);
        return ResponseEntity.ok(dataSourceService.refreshSchema(id));
    }

    @GetMapping
    public ResponseEntity<List<DataSourceSummaryDto>> getDataSources(@RequestParam Long branchId) {
        access.requireBranch(branchId, VIEWER);
        return ResponseEntity.ok(dataSourceService.findByBranchId(branchId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DataSourceDto> getDataSource(@PathVariable Long id) {
        access.requireDataSource(id, VIEWER);
        return ResponseEntity.ok(dataSourceService.findById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDataSource(@PathVariable Long id) {
        access.requireDataSource(id, EDITOR);
        softDelete.deleteDataSource(id);
        return ResponseEntity.noContent().build();
    }

    /** Brings back a deleted data source (widgets that showed it show it again). */
    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreDataSource(@PathVariable Long id) {
        access.requireDataSourceEvenIfDeleted(id, EDITOR);
        softDelete.restoreDataSource(id);
        return ResponseEntity.noContent().build();
    }
}
