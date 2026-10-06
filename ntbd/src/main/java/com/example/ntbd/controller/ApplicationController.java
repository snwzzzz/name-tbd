package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.DuplicateApplicationCommand;
import com.example.ntbd.commands.NewApplicationCommand;
import com.example.ntbd.commands.UpdateApplicationCommand;
import com.example.ntbd.dto.ApplicationDto;
import com.example.ntbd.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/applications", produces = "application/json")
public class ApplicationController {

    private final ApplicationService applicationService;
    private final WorkspaceAccess access;

    /** A new application with its default branch (where the editor starts). */
    @PostMapping
    public ResponseEntity<ApplicationDto> createApplication(@RequestBody NewApplicationCommand command) {
        access.requireWorkspace(command.workspaceId(), EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.createApplication(command));
    }

    /** The applications in one workspace, or (without {@code workspaceId}) in all of the user's workspaces. */
    @GetMapping
    public ResponseEntity<List<ApplicationDto>> getApplications(@RequestParam(required = false) Long workspaceId) {
        if (workspaceId != null) {
            access.requireWorkspace(workspaceId, VIEWER);
            return ResponseEntity.ok(applicationService.findInWorkspaces(List.of(workspaceId)));
        }
        return ResponseEntity.ok(applicationService.findInWorkspaces(access.workspaceIds()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationDto> getApplication(@PathVariable Long id) {
        access.requireApplication(id, VIEWER);
        return ResponseEntity.ok(applicationService.findById(id));
    }

    /** Renames the application or changes its description. */
    @PatchMapping("/{id}")
    public ResponseEntity<ApplicationDto> updateApplication(@PathVariable Long id,
                                                            @RequestBody UpdateApplicationCommand command) {
        access.requireApplication(id, EDITOR);
        return ResponseEntity.ok(applicationService.updateApplication(id, command));
    }

    /** A copy of the application (pages, widgets, workflows and data) in the same workspace. */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ApplicationDto> duplicateApplication(@PathVariable Long id,
                                                               @RequestBody(required = false) DuplicateApplicationCommand command) {
        access.requireApplication(id, EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.duplicateApplication(id, command));
    }

    /** Deletes the application with everything in it: branches, pages, workflows, data and versions. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {
        access.requireApplication(id, EDITOR);
        applicationService.deleteApplication(id);
        return ResponseEntity.noContent().build();
    }
}
