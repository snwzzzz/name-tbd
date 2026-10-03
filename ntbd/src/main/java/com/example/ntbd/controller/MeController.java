package com.example.ntbd.controller;

import com.example.ntbd.auth.CurrentUser;
import com.example.ntbd.dto.MeDto;
import com.example.ntbd.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user. */
@RequiredArgsConstructor
@RestController
@RequestMapping(value = "/api/me", produces = "application/json")
public class MeController {

    private final AccountService accountService;
    private final CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<MeDto> getMe() {
        return ResponseEntity.ok(accountService.me(currentUser.requireId()));
    }
}
