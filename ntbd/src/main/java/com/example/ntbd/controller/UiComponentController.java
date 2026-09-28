package com.example.ntbd.controller;

import com.example.ntbd.commands.NewUiComponentCommand;
import com.example.ntbd.dto.UiComponentDto;
import com.example.ntbd.service.UiComponentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/ui-components")
public class UiComponentController {

    private final UiComponentService uiComponentService;

    @PostMapping
    public ResponseEntity<UiComponentDto> createComponent(@RequestBody NewUiComponentCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(uiComponentService.createComponent(command));
    }

    @GetMapping
    public ResponseEntity<List<UiComponentDto>> getComponents() {
        return ResponseEntity.ok(uiComponentService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UiComponentDto> getComponent(@PathVariable Long id) {
        return ResponseEntity.ok(uiComponentService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UiComponentDto> updateComponent(
            @PathVariable Long id,
            @RequestBody com.example.ntbd.commands.UpdateUiComponentCommand command) {
        return ResponseEntity.ok(uiComponentService.updateComponent(id, command));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComponent(@PathVariable Long id) {
        uiComponentService.deleteComponent(id);
        return ResponseEntity.noContent().build();
    }
}
