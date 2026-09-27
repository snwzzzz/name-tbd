package com.example.ntbd.controller;

import com.example.ntbd.commands.NewBranchCommand;
import com.example.ntbd.dto.BranchDto;
import com.example.ntbd.service.BranchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchService branchService;

    @PostMapping
    public ResponseEntity<BranchDto> createBranch(@RequestBody NewBranchCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(branchService.createBranch(command));
    }

    @GetMapping
    public ResponseEntity<List<BranchDto>> getBranchesByApplication(@RequestParam Long applicationId) {
        return ResponseEntity.ok(branchService.findByApplicationId(applicationId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBranch(@PathVariable Long id) {
        branchService.deleteBranch(id);
        return ResponseEntity.noContent().build();
    }
}
