package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewBranchCommand;
import com.example.ntbd.dto.BranchDto;
import com.example.ntbd.service.BranchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/branches", produces = "application/json")
public class BranchController {

    private final BranchService branchService;
    private final com.example.ntbd.service.ChangeBatchService changeBatchService;
    private final WorkspaceAccess access;
    private final com.example.ntbd.service.VersionControlService versionControlService;

    @PostMapping
    public ResponseEntity<BranchDto> createBranch(@RequestBody NewBranchCommand command) {
        access.requireApplication(command.applicationId(), EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(branchService.createBranch(command));
    }

    @GetMapping
    public ResponseEntity<List<BranchDto>> getBranchesByApplication(@RequestParam Long applicationId) {
        access.requireApplication(applicationId, VIEWER);
        return ResponseEntity.ok(branchService.findByApplicationId(applicationId));
    }

    /**
     * Saves a batch of the editor's changes to the branch (widgets, workflow nodes and edges), all or
     * nothing; answers the ids of what it created, by the editor's refs (see ChangeOperation).
     */
    @PostMapping(value = "/{id}/changes", produces = "application/json")
    public ResponseEntity<com.example.ntbd.dto.ChangeBatchResultDto> applyChanges(
            @PathVariable Long id, @RequestBody com.example.ntbd.commands.ChangeBatchCommand command) {
        access.requireBranch(id, EDITOR);
        com.example.ntbd.dto.ChangeBatchResultDto result = changeBatchService.apply(id, command);
        // Saved already: an automatic version must never make the save fail
        try {
            versionControlService.autoSnapshot(id);
        } catch (RuntimeException e) {
            org.slf4j.LoggerFactory.getLogger(BranchController.class).warn("Automatic version of branch {} failed", id, e);
        }
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBranch(@PathVariable Long id) {
        access.requireBranch(id, EDITOR);
        branchService.deleteBranch(id);
        return ResponseEntity.noContent().build();
    }
}
