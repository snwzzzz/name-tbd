package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.dto.AppKeyDto;
import com.example.ntbd.livedata.appkey.AppKeyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

/** The keys live exports of an app call the data API with; made by exporting, listed and revoked here. */
@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api", produces = "application/json")
public class AppKeyController {

    private final AppKeyService keys;
    private final WorkspaceAccess access;

    @GetMapping("/applications/{applicationId}/app-keys")
    public ResponseEntity<List<AppKeyDto>> getAppKeys(@PathVariable Long applicationId) {
        access.requireApplication(applicationId, VIEWER);
        return ResponseEntity.ok(keys.list(applicationId));
    }

    /** Revokes a key: exports that carry it can no longer read or change data. */
    @DeleteMapping("/app-keys/{id}")
    public ResponseEntity<Void> revokeAppKey(@PathVariable Long id) {
        access.requireAppKey(id, EDITOR);
        keys.revoke(id);
        return ResponseEntity.noContent().build();
    }
}
