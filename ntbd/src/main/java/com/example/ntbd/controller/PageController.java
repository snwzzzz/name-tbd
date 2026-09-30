package com.example.ntbd.controller;

import com.example.ntbd.commands.NewPageCommand;
import com.example.ntbd.dto.PageDto;
import com.example.ntbd.service.PageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/pages", produces = "application/json")
public class PageController {

    private final PageService pageService;
    private final com.example.ntbd.service.UiComponentService uiComponentService;
    private final com.example.ntbd.service.WorkflowService workflowService;

    @PostMapping
    public ResponseEntity<PageDto> createPage(@RequestBody NewPageCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pageService.createPage(command));
    }

    @GetMapping(produces = "application/json")
    public ResponseEntity<List<PageDto>> getPages() {
        return ResponseEntity.ok(pageService.findAll());
    }

    @GetMapping(value = "/{id}", produces = "application/json")
    public ResponseEntity<PageDto> getPage(@PathVariable Long id) {
        return ResponseEntity.ok(pageService.findById(id));
    }

    @GetMapping(value = "/{id}/ui-components", produces = "application/json")
    public ResponseEntity<List<com.example.ntbd.dto.UiComponentDto>> getComponents(@PathVariable Long id) {
        return ResponseEntity.ok(uiComponentService.findByPageId(id));
    }

    /** The workflow holding this page's UI logic; created on first access. */
    @GetMapping(value = "/{id}/workflow", produces = "application/json")
    public ResponseEntity<com.example.ntbd.dto.WorkflowDto> getPageWorkflow(@PathVariable Long id) {
        return ResponseEntity.ok(workflowService.findOrCreateForPage(id));
    }
}
