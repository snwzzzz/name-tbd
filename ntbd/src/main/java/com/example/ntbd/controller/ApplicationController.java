package com.example.ntbd.controller;

import com.example.ntbd.commands.NewApplicationCommand;
import com.example.ntbd.dto.ApplicationDto;
import com.example.ntbd.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping
    public ResponseEntity<ApplicationDto> createApplication(@RequestBody NewApplicationCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.createApplication(command));
    }

    @GetMapping
    public ResponseEntity<List<ApplicationDto>> getApplications() {
        return ResponseEntity.ok(applicationService.findAll());
    }
}
