package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.ConnectionCommand;
import com.example.ntbd.dto.ConnectionDto;
import com.example.ntbd.livedata.ConnectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

/**
 * A workspace's connections to its customers' systems (databases, APIs, Google Sheets, Microsoft 365).
 * Credentials go in and are never sent back. Changing connections needs an editor.
 */
@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/connections", produces = "application/json")
public class ConnectionController {

    private final ConnectionService connections;
    private final WorkspaceAccess access;

    /** The connections of a workspace (or of the workspace of a branch's app: {@code ?branchId=}). */
    @GetMapping
    public ResponseEntity<List<ConnectionDto>> getConnections(@RequestParam(required = false) Long workspaceId,
                                                              @RequestParam(required = false) Long branchId) {
        if (branchId != null) access.requireBranch(branchId, VIEWER);
        Long workspace = connections.workspaceOf(workspaceId, branchId);
        access.requireWorkspace(workspace, VIEWER);
        return ResponseEntity.ok(connections.list(workspace));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConnectionDto> getConnection(@PathVariable Long id) {
        access.requireConnection(id, VIEWER);
        return ResponseEntity.ok(connections.get(id));
    }

    /** Adds a connection, once it works (the system is reached and signed in to). */
    @PostMapping
    public ResponseEntity<ConnectionDto> createConnection(@RequestBody ConnectionCommand command) {
        if (command.branchId() != null) access.requireBranch(command.branchId(), EDITOR);
        Long workspace = connections.workspaceOf(command.workspaceId(), command.branchId());
        access.requireWorkspace(workspace, EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(connections.create(workspace, command));
    }

    /** Changes a connection; a null secret keeps the stored one. */
    @PatchMapping("/{id}")
    public ResponseEntity<ConnectionDto> updateConnection(@PathVariable Long id, @RequestBody ConnectionCommand command) {
        access.requireConnection(id, EDITOR);
        return ResponseEntity.ok(connections.update(id, command));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConnection(@PathVariable Long id) {
        access.requireConnection(id, EDITOR);
        connections.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** Tries a connection out before it's saved (200: it works; 502 says why not). */
    @PostMapping("/test")
    public ResponseEntity<Void> testNewConnection(@RequestBody ConnectionCommand command) {
        if (command.branchId() != null) access.requireBranch(command.branchId(), EDITOR);
        access.requireWorkspace(connections.workspaceOf(command.workspaceId(), command.branchId()), EDITOR);
        connections.test(command);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<Void> testConnection(@PathVariable Long id) {
        access.requireConnection(id, EDITOR);
        connections.test(id);
        return ResponseEntity.ok().build();
    }

    /** What the connection can read (tables, a spreadsheet's sheets, lists), for the source settings chosen so far. */
    @PostMapping("/{id}/targets")
    public ResponseEntity<List<String>> getTargets(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> settings) {
        access.requireConnection(id, EDITOR);
        return ResponseEntity.ok(connections.targets(id, settings == null ? Map.of() : settings));
    }
}
