package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.export.ExportDataService;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.definition.AppDefinitionService;
import com.example.ntbd.export.definition.ExportOptions;
import com.example.ntbd.export.format.ExportFormatRegistry;
import com.example.ntbd.export.format.ExportedFile;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

/** Exports a branch's app: as its definition, or packaged in one of the export formats. */
@RequiredArgsConstructor
@RestController
@RequestMapping("/api")
public class ExportController {

    private final AppDefinitionService definitionService;
    private final ExportFormatRegistry formats;
    private final WorkspaceAccess access;
    private final ExportDataService exportData;
    private final com.example.ntbd.service.VersionControlService versionControlService;

    /** What the exported app runs: its pages, widgets, workflows and data (embedded). */
    @GetMapping(value = "/branches/{branchId}/definition", produces = "application/json")
    public ResponseEntity<AppDefinition> getDefinition(@PathVariable Long branchId) {
        access.requireBranch(branchId, VIEWER);
        return ResponseEntity.ok(definitionService.build(branchId));
    }

    /**
     * The app packaged for download (see {@link #getExportFormats()} for the formats).
     * {@code dataMode}: embed (the data in the file, only the columns the app uses unless {@code allColumns}),
     * live_cached or live (the data stays where it is; the app reads it through this server with a key of its
     * own). Without one: the app's last choice. Choosing (and live exports, which make a key) needs an editor.
     */
    @GetMapping("/branches/{branchId}/export")
    public ResponseEntity<byte[]> exportApp(@PathVariable Long branchId,
                                            @RequestParam(defaultValue = "html") String format,
                                            @RequestParam(required = false) String dataMode,
                                            @RequestParam(defaultValue = "false") boolean allColumns) {
        boolean live = exportData.modeOf(branchId, dataMode).live();
        access.requireBranch(branchId, dataMode != null || live ? EDITOR : VIEWER);
        var exportFormat = formats.get(format);
        // What was exported can be found again in the History panel
        versionControlService.snapshotIfChanged(branchId, com.example.ntbd.domain.VersionKind.BEFORE_EXPORT, null);
        ExportOptions options = exportData.prepare(branchId, dataMode, allColumns);
        ExportedFile file = exportFormat.export(definitionService.build(branchId, options));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(file.mediaType());
        headers.setContentDisposition(ContentDisposition.attachment().filename(file.fileName()).build());
        return new ResponseEntity<>(file.content(), headers, HttpStatus.OK);
    }

    /** What an export would do with each data source: the app's data mode, and the columns an embedded export carries. */
    @GetMapping(value = "/branches/{branchId}/export/data", produces = "application/json")
    public ResponseEntity<ExportDataService.DataReport> getExportData(@PathVariable Long branchId) {
        access.requireBranch(branchId, VIEWER);
        return ResponseEntity.ok(exportData.report(branchId));
    }

    /** The export formats there are (ids for {@code ?format=}). */
    @GetMapping(value = "/export/formats", produces = "application/json")
    public ResponseEntity<List<String>> getExportFormats() {
        return ResponseEntity.ok(formats.ids());
    }
}
