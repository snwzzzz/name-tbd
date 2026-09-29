package com.example.ntbd.controller;

import com.example.ntbd.commands.NewVersionControlCommand;
import com.example.ntbd.dto.VersionControlDto;
import com.example.ntbd.service.VersionControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/versions", produces = "application/json")
public class VersionControlController {

    private final VersionControlService versionControlService;

    @PostMapping
    public ResponseEntity<VersionControlDto> createVersion(@RequestBody NewVersionControlCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(versionControlService.createVersion(command));
    }

    @GetMapping
    public ResponseEntity<List<VersionControlDto>> getVersionsByBranch(@RequestParam Long branchId) {
        return ResponseEntity.ok(versionControlService.findByBranchId(branchId));
    }

    @GetMapping("/latest")
    public ResponseEntity<VersionControlDto> getLatestVersionByBranch(@RequestParam Long branchId) {
        return versionControlService.findLatestByBranchId(branchId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
