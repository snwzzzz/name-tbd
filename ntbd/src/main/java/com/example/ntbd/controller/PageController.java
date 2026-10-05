package com.example.ntbd.controller;

import com.example.ntbd.auth.WorkspaceAccess;
import com.example.ntbd.commands.NewPageCommand;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.service.PageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.example.ntbd.domain.WorkspaceRole.EDITOR;
import static com.example.ntbd.domain.WorkspaceRole.VIEWER;

@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/pages", produces = "application/json")
public class PageController {

    private final PageService pageService;
    private final com.example.ntbd.service.UiComponentService uiComponentService;
    private final com.example.ntbd.service.WorkflowService workflowService;
    private final com.example.ntbd.service.PageContentService pageContentService;
    private final WorkspaceAccess access;
    private final com.example.ntbd.service.VariableService variableService;

    @PostMapping
    public ResponseEntity<PageDto> createPage(@RequestBody NewPageCommand command) {
        access.requireBranch(command.branchId(), EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(pageService.createPage(command));
    }

    /** The branch's pages. */
    @GetMapping(produces = "application/json")
    public ResponseEntity<List<PageDto>> getPages(@RequestParam Long branchId) {
        access.requireBranch(branchId, VIEWER);
        return ResponseEntity.ok(pageService.findByBranchId(branchId));
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<PageDto> getPage(@PathVariable Long id) {
        access.requirePage(id, VIEWER);
        return ResponseEntity.ok(pageService.findById(id));
    }

    @GetMapping(value = "/{id}/ui-components", produces = "application/json")
    public ResponseEntity<List<com.example.ntbd.dto.UiComponentDto>> getComponents(@PathVariable Long id) {
        access.requirePage(id, VIEWER);
        return ResponseEntity.ok(uiComponentService.findByPageId(id));
    }

    /** Everything the editor shows of the page in one answer: its widgets (props complete) and workflow. */
    @GetMapping(value = "/{id}/full", produces = "application/json")
    public ResponseEntity<com.example.ntbd.dto.PageContentDto> getPageContent(@PathVariable Long id) {
        access.requirePage(id, VIEWER);
        return ResponseEntity.ok(pageContentService.load(id));
    }

    /** Replaces the page's own variables. */
    @PutMapping(value = "/{id}/variables", produces = "application/json")
    public ResponseEntity<List<com.example.ntbd.domain.VariableDefinition>> setPageVariables(
            @PathVariable Long id, @RequestBody List<com.example.ntbd.domain.VariableDefinition> variables) {
        access.requirePage(id, EDITOR);
        return ResponseEntity.ok(variableService.setPageVariables(id, variables));
    }

    /** The workflow holding this page's UI logic; created on first access. */
    @GetMapping(value = "/{id}/workflow", produces = "application/json")
    public ResponseEntity<com.example.ntbd.dto.WorkflowDto> getPageWorkflow(@PathVariable Long id) {
        access.requirePage(id, VIEWER);
        return ResponseEntity.ok(workflowService.findOrCreateForPage(id));
    }
}
