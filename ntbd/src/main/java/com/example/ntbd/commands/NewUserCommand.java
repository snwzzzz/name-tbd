package com.example.ntbd.commands;

public record NewUserCommand (
    String username,
    String email,
    String password,
    String firstName,
    String lastName
){}

