package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
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
    private final WorkspaceAccess access;

    /** Imports tabular data (e.g. the text of a CSV file) as a new data source. */
    @PostMapping
    public ResponseEntity<DataSourceDto> importDataSource(@RequestBody NewDataSourceCommand command) {
        access.requireBranch(command.branchId(), EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(dataSourceService.importDataSource(command));
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
        dataSourceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
