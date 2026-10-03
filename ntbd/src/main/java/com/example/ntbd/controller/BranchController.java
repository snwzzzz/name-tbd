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
    private final WorkspaceAccess access;

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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBranch(@PathVariable Long id) {
        access.requireBranch(id, EDITOR);
        branchService.deleteBranch(id);
        return ResponseEntity.noContent().build();
    }
}
