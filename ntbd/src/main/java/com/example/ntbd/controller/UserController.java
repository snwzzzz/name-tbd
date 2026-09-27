package com.example.ntbd.controller;

import com.example.ntbd.commands.NewUserCommand;
import com.example.ntbd.dto.UserDto;
import com.example.ntbd.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserDto> createUser(@RequestBody NewUserCommand command) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(command));
    }
}
