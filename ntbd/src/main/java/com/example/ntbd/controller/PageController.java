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
@RequestMapping("/api/pages")
public class PageController {

    private final PageService pageService;
    private final com.example.ntbd.service.UiComponentService uiComponentService;

    @PostMapping
    public ResponseEntity<PageDto> createPage(@RequestBody NewPageCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pageService.createPage(command));
    }

    @GetMapping
    public ResponseEntity<List<PageDto>> getPages() {
        return ResponseEntity.ok(pageService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PageDto> getPage(@PathVariable Long id) {
        return ResponseEntity.ok(pageService.findById(id));
    }

    @GetMapping("/{id}/ui-components")
    public ResponseEntity<List<com.example.ntbd.dto.UiComponentDto>> getComponents(@PathVariable Long id) {
        return ResponseEntity.ok(uiComponentService.findByPageId(id));
    }
}
