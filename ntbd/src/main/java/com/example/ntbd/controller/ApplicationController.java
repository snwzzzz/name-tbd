package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewApplicationCommand;
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
}
