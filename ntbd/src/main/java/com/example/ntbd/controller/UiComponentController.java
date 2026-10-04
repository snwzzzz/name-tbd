package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.service.UiComponentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/ui-components", produces = "application/json")
public class UiComponentController {

    private final UiComponentService uiComponentService;
    private final com.example.ntbd.service.SoftDeleteService softDelete;
    private final WorkspaceAccess access;

    @PostMapping
    public ResponseEntity<UiComponentDto> createComponent(@RequestBody NewUiComponentCommand command) {
        access.requirePage(command.pageId(), EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(uiComponentService.createComponent(command));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UiComponentDto> getComponent(@PathVariable Long id) {
        access.requireUiComponent(id, VIEWER);
        return ResponseEntity.ok(uiComponentService.findById(id));
    }

    @GetMapping("/{id}/props")
    public ResponseEntity<Map<String, String>> getComponentProps(@PathVariable Long id) {
        access.requireUiComponent(id, VIEWER);
        return ResponseEntity.ok(uiComponentService.findPropsById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UiComponentDto> updateComponent(
            @PathVariable Long id,
            @RequestBody com.example.ntbd.commands.UpdateUiComponentCommand command) {
        access.requireUiComponent(id, EDITOR);
        return ResponseEntity.ok(uiComponentService.updateComponent(id, command));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComponent(@PathVariable Long id) {
        access.requireUiComponent(id, EDITOR);
        softDelete.deleteWidget(id);
        return ResponseEntity.noContent().build();
    }

    /** Brings back a deleted widget, with what was inside it, and the same id. */
    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreComponent(@PathVariable Long id) {
        access.requireUiComponentEvenIfDeleted(id, EDITOR);
        softDelete.restoreWidget(id);
        return ResponseEntity.noContent().build();
    }
}
