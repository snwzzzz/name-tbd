package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewVersionControlCommand;
import com.example.ntbd.commands.RenameVersionCommand;
import com.example.ntbd.dto.VersionDto;
import com.example.ntbd.export.definition.AppDefinition;
import com.example.ntbd.export.format.ExportFormatRegistry;
import com.example.ntbd.export.format.ExportedFile;
import com.example.ntbd.service.VersionControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

/** A branch's versions: list, save, rename, preview and restore (see {@link VersionControlService}). */
@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/versions", produces = "application/json")
public class VersionControlController {

    /** Where a preview path starts; SecurityConfig gives these answers {@link #PREVIEW_CSP} instead of the API's. */
    public static final String PREVIEW_PATH = "/api/versions/*/preview";

    /**
     * The preview runs the exported app's own (inline) code, sandboxed: an opaque origin, so it can't
     * use the editor's session or reach the API.
     */
    public static final String PREVIEW_CSP = "sandbox allow-scripts allow-modals allow-popups allow-forms; "
            + "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https:; "
            + "img-src data: https:; font-src data: https:; frame-ancestors 'none'";

    private final VersionControlService versionControlService;
    private final ExportFormatRegistry formats;
    private final WorkspaceAccess access;

    @GetMapping
    public ResponseEntity<List<VersionDto>> getVersions(@RequestParam Long branchId) {
        access.requireBranch(branchId, VIEWER);
        return ResponseEntity.ok(versionControlService.list(branchId));
    }

    /** Saves the branch as it is now as a version. */
    @PostMapping
    public ResponseEntity<VersionDto> saveVersion(@RequestBody NewVersionControlCommand command) {
        access.requireBranch(command.branchId(), EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(versionControlService.save(command.branchId(), command.label()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<VersionDto> renameVersion(@PathVariable Long id, @RequestBody RenameVersionCommand command) {
        access.requireVersion(id, EDITOR);
        return ResponseEntity.ok(versionControlService.rename(id, command.label()));
    }

    /** Makes the branch what it was in this version; what it was before is kept as a version first. */
    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreVersion(@PathVariable Long id) {
        access.requireVersion(id, EDITOR);
        versionControlService.restore(id);
        return ResponseEntity.noContent().build();
    }

    /** What the app was in this version, as its export runs it. */
    @GetMapping("/{id}/definition")
    public ResponseEntity<AppDefinition> getVersionDefinition(@PathVariable Long id) {
        access.requireVersion(id, VIEWER);
        return ResponseEntity.ok(versionControlService.definition(id));
    }

    /** The app as it was in this version, to open in a browser tab (the exported app, read-only). */
    @GetMapping(value = "/{id}/preview", produces = "text/html")
    public ResponseEntity<byte[]> previewVersion(@PathVariable Long id) {
        access.requireVersion(id, VIEWER);
        ExportedFile file = formats.get("html").export(versionControlService.definition(id));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(file.mediaType());
        headers.setContentDisposition(ContentDisposition.inline().filename(file.fileName()).build());
        headers.set("Content-Security-Policy", PREVIEW_CSP);
        return new ResponseEntity<>(file.content(), headers, HttpStatus.OK);
    }
}
